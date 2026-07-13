import re
from datetime import datetime, date
from typing import List, Dict, Any, Optional


class BankTransaction:
    def __init__(self, tx_date: date, raw_description: str, amount: float, transaction_type: str):
        self.date = tx_date
        self.raw_description = raw_description.strip()
        self.amount = float(amount)
        self.transaction_type = transaction_type  # 'DEBIT' or 'CREDIT'

    def to_dict(self) -> Dict[str, Any]:
        return {
            "date": self.date,
            "raw_description": self.raw_description,
            "amount": self.amount,
            "transaction_type": self.transaction_type
        }


# ---------------------------------------------------------------------------
# Date helpers
# ---------------------------------------------------------------------------

DATE_PATTERNS = [
    # DD/MM/YYYY  DD-MM-YYYY  DD.MM.YYYY
    (r'\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})\b', '%d/%m/%Y'),
    # DD/MM/YY  DD-MM-YY  DD.MM.YY
    (r'\b(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2})\b', '%d/%m/%y'),
    # DD MMM YYYY  or  DD-MMM-YYYY  or  DD-MMM-YY
    (r'\b(\d{1,2})[\s\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s\-](\d{2,4})\b', None),
    # YYYY-MM-DD (ISO)
    (r'\b(\d{4})\-(\d{2})\-(\d{2})\b', '%Y-%m-%d'),
]

_MONTH_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12
}


def parse_date_str(date_str: str) -> Optional[date]:
    date_str = date_str.strip()
    formats = [
        "%d/%m/%Y", "%d-%m-%Y", "%d.%m.%Y",
        "%d/%m/%y", "%d-%m-%y", "%d.%m.%y",
        "%d %b %Y", "%d-%b-%Y", "%d %b %y", "%d-%b-%y",
        "%d %B %Y", "%d-%B-%Y",
        "%Y-%m-%d",
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    return None


def find_date_in_text(text: str) -> Optional[re.Match]:
    """Find the first date-like token in a piece of text."""
    patterns = [
        r'\b\d{1,2}[/\-\.]\d{1,2}[/\-\.]\d{2,4}\b',
        r'\b\d{1,2}[\s\-](Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-zA-Z]*[\s\-]\d{2,4}\b',
        r'\b\d{4}\-\d{2}\-\d{2}\b',
    ]
    for pat in patterns:
        m = re.search(pat, text, re.IGNORECASE)
        if m:
            return m
    return None


def extract_amounts(text: str) -> List[float]:
    """Find all monetary amounts in a string."""
    # Match numbers like 1,23,456.78 or 456.78 or 1234
    raw = re.findall(r'[\d,]+\.?\d*', text)
    results = []
    for r in raw:
        try:
            val = float(r.replace(',', ''))
            if val >= 1:  # ignore tiny fragments
                results.append(val)
        except ValueError:
            pass
    return results


def determine_direction(text: str) -> str:
    """Determine DEBIT or CREDIT from transaction text."""
    lower = text.lower()
    # Credit card payments are outflows (debits) from bank accounts
    if re.search(r'credit\s*card\s*payment|cc\s*payment', lower):
        return "DEBIT"
    # Strong credit signals
    if re.search(r'\bcr\b|/cr\b|/cr/|\bcredit\b|\bdeposit\b|\brefund\b|\bsalary\b|\bcash\s*dep\b', lower):
        return "CREDIT"
    # INFT / NEFT received
    if re.search(r'\binft\b|\bneft\b|\brtgs\b', lower):
        # Check if it's money going out (transfer to) vs coming in (from)
        if re.search(r'transfer\s*(to|by)\b|payment\s*to\b', lower):
            return "DEBIT"
        if re.search(r'transfer\s*from\b|received\b|from\b', lower):
            return "CREDIT"
    # Strong debit signals
    if re.search(r'\bdr\b|/dr\b|/dr/|\bdebit\b|\bwithdrawal\b|\bpurchase\b|\bupi/\b', lower):
        return "DEBIT"
    return "DEBIT"  # default


# ---------------------------------------------------------------------------
# Header / noise line detection
# ---------------------------------------------------------------------------

HEADER_KEYWORDS = {
    'date', 'narration', 'particulars', 'description', 'transaction',
    'withdrawal', 'deposit', 'balance', 'amount', 'chq', 'cheque',
    'ref', 'reference', 's.no', 'sr.no', 'page', 'statement', 'account',
    'closing', 'opening', 'value', 'remarks', 'details'
}


def is_noise_line(line: str) -> bool:
    """Return True if this line is a header, footer, or separator."""
    stripped = line.strip()
    if not stripped or len(stripped) < 3:
        return True
    if re.match(r'^[\-=_*\.\s]+$', stripped):
        return True
    words = set(re.findall(r'[a-z]+', stripped.lower()))
    if words and words.issubset(HEADER_KEYWORDS):
        return True
    # Typical footer lines
    if re.search(r'www\.|dial\s*your\s*bank|registered\s*mobile|never\s*share', stripped, re.IGNORECASE):
        return True
    return False


# ---------------------------------------------------------------------------
# ICICI Statement Parser  (actual format from real statements)
#
# Real format observed:
#   Merchant Name                          ← standalone merchant line
#   S_No  DD.MM.YYYY  Amt  Balance         ← transaction data line
#   UPI/Description/ref/bank               ← description continuation
#
# OR credit rows:
#   S_No  DD.MM.YYYY  (empty debit)  Amt  Balance
# ---------------------------------------------------------------------------

class ICICIParser:
    bank_name = "ICICI"

    def parse(self, text: str) -> List[Dict[str, Any]]:
        lines = [l for l in text.split('\n') if l.strip()]
        transactions = []

        i = 0
        while i < len(lines):
            line = lines[i].strip()

            # Match a data row: optional serial, date, then 2 or more amounts
            # e.g.  "1  06.05.2026  320.00  113779.69"
            data_match = self._match_data_row(line)
            if data_match:
                tx_date, amounts = data_match

                # The merchant name is often the line BEFORE the data row
                merchant_line = ""
                if i > 0 and not is_noise_line(lines[i-1]) and not self._match_data_row(lines[i-1].strip()):
                    candidate = lines[i-1].strip()
                    # Ensure it's not a date line itself
                    if not find_date_in_text(candidate):
                        merchant_line = candidate

                # Collect continuation lines (UPI details, etc.)
                desc_parts = []
                j = i + 1
                while j < len(lines):
                    nxt = lines[j].strip()
                    if self._match_data_row(nxt):
                        break
                    if is_noise_line(nxt):
                        j += 1
                        continue
                    if find_date_in_text(nxt) and not nxt.startswith('UPI') and not nxt.startswith('BIL'):
                        break
                    desc_parts.append(nxt)
                    j += 1
                i = j

                full_desc = merchant_line
                if desc_parts:
                    full_desc = (full_desc + " " + " ".join(desc_parts)).strip()
                if not full_desc:
                    full_desc = "Transaction"

                # ICICI layout: [Withdrawal_Amt] [Deposit_Amt] [Balance]
                # Often one of Withdrawal/Deposit is missing (blank column)
                # We need to determine which amount is the transaction
                tx_amount, tx_type = self._resolve_amount_and_type(amounts, full_desc)
                if tx_amount and tx_amount > 0:
                    transactions.append({
                        "date": tx_date,
                        "raw_description": re.sub(r'\s+', ' ', full_desc).strip(),
                        "amount": tx_amount,
                        "transaction_type": tx_type
                    })
                continue

            i += 1

        return transactions

    def _match_data_row(self, line: str):
        """
        Match a line like: [serial]  DD.MM.YYYY  amount  [amount]  balance
        Returns (date, amounts_list) or None.
        """
        # Strip optional leading serial number
        stripped = re.sub(r'^\d{1,4}\s+', '', line.strip())

        date_match = find_date_in_text(stripped)
        if not date_match:
            return None

        date_str = date_match.group(0)
        parsed_date = parse_date_str(date_str)
        if not parsed_date:
            return None

        # Everything after the date
        after_date = stripped[date_match.end():].strip()

        # Must have at least one valid monetary amount after the date
        amounts = extract_amounts(after_date)
        if not amounts:
            return None

        # Validate: all amounts should be plausible (not a ref/serial number fragment)
        # At least one amount >= 1.0
        valid_amounts = [a for a in amounts if a >= 0.01]
        if not valid_amounts:
            return None

        return parsed_date, valid_amounts

    def _resolve_amount_and_type(self, amounts: List[float], desc: str):
        """
        Given the list of numeric values after the date and the description text,
        determine the transaction amount and DEBIT/CREDIT type.

        ICICI columns: Withdrawal_Amt | Deposit_Amt | Balance
        - If 2 amounts: tx_amount=amounts[0], balance=amounts[1]
        - If 3 amounts: first is withdrawal, second is deposit, third is balance
          Usually one of withdrawal/deposit is 0 (blank column)
        """
        if not amounts:
            return None, "DEBIT"

        if len(amounts) == 1:
            tx_amount = amounts[0]
            tx_type = determine_direction(desc)
        elif len(amounts) == 2:
            tx_amount = amounts[0]
            tx_type = determine_direction(desc)
        else:
            # 3+ amounts: ICICI has withdrawal, deposit, balance columns
            # The transaction amount is NOT the last one (balance)
            # Heuristic: if the description has credit-like keywords, use amounts[1]
            # otherwise use amounts[0]
            tx_type = determine_direction(desc)
            if tx_type == "CREDIT":
                tx_amount = amounts[-2] if amounts[-2] > 0 else amounts[0]
            else:
                tx_amount = amounts[0]

        return round(tx_amount, 2), tx_type


# ---------------------------------------------------------------------------
# HDFC Statement Parser
# ---------------------------------------------------------------------------

class HDFCParser:
    bank_name = "HDFC"

    def parse(self, text: str) -> List[Dict[str, Any]]:
        """
        HDFC standard row: Date  Narration  Chq/Ref  Value_Date  Withdrawal  Deposit  Closing_Balance
        Sometimes spread across 2 lines.
        """
        lines = [l.strip() for l in text.split('\n')]
        transactions = []

        i = 0
        while i < len(lines):
            line = lines[i]
            if is_noise_line(line):
                i += 1
                continue

            date_match = find_date_in_text(line)
            if not date_match:
                i += 1
                continue

            date_str = date_match.group(0)
            parsed_date = parse_date_str(date_str)
            if not parsed_date:
                i += 1
                continue

            # Collect this line + possible continuation
            full_line = line
            j = i + 1
            while j < len(lines):
                nxt = lines[j]
                if is_noise_line(nxt):
                    j += 1
                    break
                if find_date_in_text(nxt):
                    break
                full_line += " " + nxt
                j += 1
            i = j

            # Strip the date
            rest = full_line[full_line.find(date_str) + len(date_str):].strip()

            # Find value date (second date in the line)
            val_date_match = find_date_in_text(rest)
            if val_date_match:
                narration = rest[:val_date_match.start()].strip()
                amounts_part = rest[val_date_match.end():].strip()
            else:
                # No value date found
                # Try to find amount cluster at end of rest
                narration = rest
                amounts_part = rest

            amounts = extract_amounts(amounts_part)
            if not amounts:
                amounts = extract_amounts(rest)
            if not amounts:
                continue

            # HDFC: [Withdrawal] [Deposit] [Balance]  - 3 columns typically
            if len(amounts) >= 3:
                tx_amount = amounts[0] if amounts[0] > 0 else amounts[1]
                tx_type = "DEBIT" if amounts[0] > 0 else "CREDIT"
            elif len(amounts) == 2:
                tx_amount = amounts[0]
                tx_type = determine_direction(full_line)
            else:
                tx_amount = amounts[0]
                tx_type = determine_direction(full_line)

            # Clean narration
            for amt_str in re.findall(r'[\d,]+\.?\d*', amounts_part):
                narration = narration.replace(amt_str, '')
            narration = re.sub(r'\s+', ' ', narration).strip()
            if not narration:
                narration = "Transaction"

            if tx_amount > 0:
                transactions.append({
                    "date": parsed_date,
                    "raw_description": narration,
                    "amount": round(tx_amount, 2),
                    "transaction_type": tx_type
                })

        return transactions


# ---------------------------------------------------------------------------
# SBI Statement Parser
# ---------------------------------------------------------------------------

class SBIParser:
    bank_name = "SBI"

    def parse(self, text: str) -> List[Dict[str, Any]]:
        """SBI format: Date | Narration | Ref/Cheque | Debit | Credit | Balance"""
        lines = [l.strip() for l in text.split('\n')]
        transactions = []

        for line in lines:
            if is_noise_line(line):
                continue
            date_match = find_date_in_text(line)
            if not date_match:
                continue

            date_str = date_match.group(0)
            parsed_date = parse_date_str(date_str)
            if not parsed_date:
                continue

            rest = line[date_match.end():].strip()
            amounts = extract_amounts(rest)
            if not amounts:
                continue

            if len(amounts) >= 3:
                # Debit, Credit, Balance columns
                debit = amounts[-3]
                credit = amounts[-2]
                if debit > 0 and credit == 0:
                    tx_amount, tx_type = debit, "DEBIT"
                elif credit > 0 and debit == 0:
                    tx_amount, tx_type = credit, "CREDIT"
                else:
                    tx_amount = amounts[0]
                    tx_type = determine_direction(line)
            elif len(amounts) == 2:
                tx_amount = amounts[0]
                tx_type = determine_direction(line)
            else:
                tx_amount = amounts[0]
                tx_type = determine_direction(line)

            narration = rest
            for amt_str in re.findall(r'[\d,]+\.?\d*', rest):
                narration = narration.replace(amt_str, '')
            narration = re.sub(r'\s+', ' ', narration).strip()

            if tx_amount > 0:
                transactions.append({
                    "date": parsed_date,
                    "raw_description": narration or "Transaction",
                    "amount": round(tx_amount, 2),
                    "transaction_type": tx_type
                })

        return transactions


# ---------------------------------------------------------------------------
# Generic Parser — robust fallback
# ---------------------------------------------------------------------------

class GenericParser:
    bank_name = "Generic"

    def parse(self, text: str) -> List[Dict[str, Any]]:
        """
        Line-by-line scan. For every line that starts with a date,
        extract amount(s) and infer direction.
        """
        lines = [l.strip() for l in text.split('\n')]
        transactions = []
        pending: Optional[Dict] = None

        for line in lines:
            if is_noise_line(line):
                if pending:
                    transactions.append(pending)
                    pending = None
                continue

            date_match = find_date_in_text(line)
            if date_match:
                if pending:
                    transactions.append(pending)

                date_str = date_match.group(0)
                parsed_date = parse_date_str(date_str)
                if not parsed_date:
                    pending = None
                    continue

                rest = line[date_match.end():].strip()
                amounts = extract_amounts(rest)
                if not amounts:
                    pending = None
                    continue

                if len(amounts) >= 2:
                    tx_amount = amounts[-2]
                else:
                    tx_amount = amounts[0]

                narration = rest
                for amt_str in re.findall(r'[\d,]+\.?\d*', rest):
                    narration = narration.replace(amt_str, '')
                narration = re.sub(r'\s+', ' ', narration).strip()

                tx_type = determine_direction(line)

                if tx_amount > 0:
                    pending = {
                        "date": parsed_date,
                        "raw_description": narration or "Transaction",
                        "amount": round(tx_amount, 2),
                        "transaction_type": tx_type
                    }
                else:
                    pending = None
            else:
                # Continuation line
                if pending and not is_noise_line(line):
                    pending["raw_description"] += " " + line

        if pending:
            transactions.append(pending)

        # Clean descriptions
        for tx in transactions:
            tx["raw_description"] = re.sub(r'\s+', ' ', tx["raw_description"]).strip()

        return transactions


# ---------------------------------------------------------------------------
# Axis / Kotak / IDFC — delegate to Generic
# ---------------------------------------------------------------------------

class AxisParser(GenericParser):
    bank_name = "Axis"

class KotakParser(GenericParser):
    bank_name = "Kotak"

class IDFCParser(GenericParser):
    bank_name = "IDFC"


# ---------------------------------------------------------------------------
# Bank Detector
# ---------------------------------------------------------------------------

class BankDetector:
    @staticmethod
    def detect_bank_with_confidence(text: str) -> tuple:
        """
        Detect bank from header/metadata of statement along with a confidence percentage.
        Returns (bank_name, confidence).
        """
        if not text:
            return "Generic", 0.0

        header = text[:800].upper()

        if "ICICI BANK" in header:
            return "ICICI", 100.0
        elif "HDFC BANK" in header:
            return "HDFC", 100.0
        elif "STATE BANK OF INDIA" in header or ("SBI" in header and "SAVING" in header):
            return "SBI", 100.0
        elif "AXIS BANK" in header:
            return "Axis", 100.0
        elif "KOTAK MAHINDRA" in header or "KOTAK BANK" in header:
            return "Kotak", 100.0
        elif "IDFC FIRST" in header or "IDFC BANK" in header:
            return "IDFC", 100.0
        elif "HDFC" in header:
            return "HDFC", 85.0
        elif "ICICI" in header:
            return "ICICI", 85.0
        elif "SBI" in header:
            return "SBI", 85.0
        elif "AXIS" in header:
            return "Axis", 85.0
        elif "KOTAK" in header:
            return "Kotak", 85.0
        elif "IDFC" in header:
            return "IDFC", 85.0

        return "Generic", 50.0

    @staticmethod
    def detect_bank(text: str) -> str:
        return BankDetector.detect_bank_with_confidence(text)[0]

    @staticmethod
    def get_parser(bank_name: str):
        parsers = {
            "HDFC": HDFCParser(),
            "ICICI": ICICIParser(),
            "SBI": SBIParser(),
            "Axis": AxisParser(),
            "Kotak": KotakParser(),
            "IDFC": IDFCParser(),
            "Generic": GenericParser()
        }
        return parsers.get(bank_name, parsers["Generic"])
