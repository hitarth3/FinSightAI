import pytest
import json
from datetime import date
from unittest.mock import patch
from httpx import AsyncClient

from app.modules.expenses.bank_parser import BankDetector
from app.modules.expenses.statement_service import StatementService
from app.modules.expenses.models import ExpenseCategory

def test_bank_detection() -> None:
    """Verifies that the BankDetector correctly detects different banks from text."""
    hdfc_text = "This is a statement from HDFC BANK LTD. Branch code 1234."
    icici_text = "Statement of Account for ICICI BANK. Date 01-01-2026."
    sbi_text = "STATE BANK OF INDIA - Corporate Branch Mumbai."
    generic_text = "Standard transaction statement report."

    assert BankDetector.detect_bank(hdfc_text) == "HDFC"
    assert BankDetector.detect_bank(icici_text) == "ICICI"
    assert BankDetector.detect_bank(sbi_text) == "SBI"
    assert BankDetector.detect_bank(generic_text) == "Generic"

def test_hdfc_parser_lines() -> None:
    """Verifies HDFC bank parser on sample statement text lines."""
    parser = BankDetector.get_parser("HDFC")
    sample_text = (
        "02/05/23 UPI-Zomato-12345/DR 02/05/23 150.00 12350.00\n"
        "03/05/23 Salary Credited 03/05/23 50000.00 62350.00\n"
    )
    txs = parser.parse(sample_text)
    assert len(txs) == 2
    
    # First is Debit/Withdrawal
    assert txs[0]["amount"] == 150.00
    assert txs[0]["transaction_type"] == "DEBIT"
    assert "zomato" in txs[0]["raw_description"].lower()

    # Second is Credit/Deposit
    assert txs[1]["amount"] == 50000.00
    assert txs[1]["transaction_type"] == "CREDIT"
    assert "salary" in txs[1]["raw_description"].lower()

def test_local_classify() -> None:
    """Verifies rule-based local classification maps categories correctly."""
    zomato_desc = "UPI-ZOMATO-12345/DR"
    uber_desc = "UPI-UBER TRIP-67890/DR"
    netflix_desc = "NETFLIX MOVIE SUBSCRIPTION"
    unknown_desc = "RANDOM OTHER CHARGE"

    m1, c1, conf1 = StatementService.local_classify_single(zomato_desc)
    assert c1 == "FOOD"
    assert m1 == "ZOMATO"

    m2, c2, conf2 = StatementService.local_classify_single(uber_desc)
    assert c2 == "TRAVEL"
    assert m2 == "UBER TRIP"

    m3, c3, conf3 = StatementService.local_classify_single(netflix_desc)
    assert c3 == "ENTERTAINMENT" or c3 == "SUBSCRIPTION"

    m4, c4, conf4 = StatementService.local_classify_single(unknown_desc)
    assert c4 == "MISCELLANEOUS"

@pytest.mark.asyncio
async def test_statement_import_api_workflow(client: AsyncClient) -> None:
    """Verifies complete bank statement import API workflow."""
    # 1. Register & Login
    reg_payload = {
        "full_name": "Test User",
        "email": "tester@finsight.ai",
        "password": "Password123!"
    }
    await client.post("/api/auth/register", json=reg_payload)

    login_payload = {
        "email": "tester@finsight.ai",
        "password": "Password123!"
    }
    login_resp = await client.post("/api/auth/login", json=login_payload)
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Upload Statement
    # We will upload a mock text file as PDF/image
    statement_content = (
        "HDFC BANK STATEMENT\n"
        "02/05/23 UPI-Zomato-12345/DR 02/05/23 150.00 12350.00\n"
        "03/05/23 Netflix Subscription 03/05/23 499.00 11851.00\n"
        "04/05/23 Salary 04/05/23 60000.00 71851.00\n"
    )

    with patch("app.modules.expenses.statement_service.StatementService.extract_text_from_file") as mock_extract:
        mock_extract.return_value = statement_content

        files = {"file": ("statement.pdf", statement_content.encode("utf-8"), "application/pdf")}
        
        upload_resp = await client.post("/api/expenses/statement/upload", files=files, headers=headers)
        assert upload_resp.status_code == 200
        
        upload_data = upload_resp.json()
        assert upload_data["success"] is True
        import_id = upload_data["data"]["id"]
        assert upload_data["data"]["status"] == "UPLOADED"

        # Start parsing by confirming/overriding bank
        override_resp = await client.post(
            f"/api/expenses/statement/{import_id}/override-bank",
            json={"bank_name": "HDFC"},
            headers=headers
        )
        assert override_resp.status_code == 200

        # Wait for background task processing (since tests use SQLite memory and run immediately, 
        # the background task runs synchronously on the event loop, or we can check status)
        # Let's poll until status is READY_FOR_REVIEW
        for _ in range(10):
            status_resp = await client.get(f"/api/expenses/statement/{import_id}/status", headers=headers)
            assert status_resp.status_code == 200
            if status_resp.json()["data"]["status"] == "READY_FOR_REVIEW":
                break
            # Sleep briefly to yield execution to background tasks
            import asyncio
            await asyncio.sleep(0.5)

        # 3. Fetch Summary
        summary_resp = await client.get(f"/api/expenses/statement/{import_id}/summary", headers=headers)
        assert summary_resp.status_code == 200
        summary_data = summary_resp.json()["data"]
        assert summary_data["bank_name"] == "HDFC"
        assert summary_data["total_transactions"] == 3
        assert summary_data["expense_transactions"] == 2
        assert summary_data["income_transactions"] == 1

        # 4. Fetch Transactions
        tx_resp = await client.get(f"/api/expenses/statement/{import_id}/transactions", headers=headers)
        assert tx_resp.status_code == 200
        txs = tx_resp.json()["data"]
        assert len(txs) == 3
        
        # Get IDs
        zomato_tx = next(t for t in txs if "zomato" in t["raw_description"].lower())
        netflix_tx = next(t for t in txs if "netflix" in t["raw_description"].lower())
        salary_tx = next(t for t in txs if "salary" in t["raw_description"].lower())

        assert zomato_tx["amount"] == 150.00
        assert zomato_tx["transaction_type"] == "DEBIT"
        assert netflix_tx["amount"] == 499.00
        assert salary_tx["transaction_type"] == "CREDIT"

        # 5. Update Transaction
        update_payload = {"merchant": "ZOMATO RESTAURANT", "category": "FOOD"}
        update_resp = await client.put(
            f"/api/expenses/statement/{import_id}/transactions/{zomato_tx['id']}", 
            json=update_payload, 
            headers=headers
        )
        assert update_resp.status_code == 200
        assert update_resp.json()["data"]["merchant"] == "ZOMATO RESTAURANT"

        # 6. Bulk Reclassify (reclassify Netflix to SUBSCRIPTION)
        reclassify_payload = {
            "transaction_ids": [netflix_tx["id"]],
            "category": "SUBSCRIPTION"
        }
        reclass_resp = await client.post("/api/expenses/reclassify", json=reclassify_payload, headers=headers)
        assert reclass_resp.status_code == 200
        assert reclass_resp.json()["data"]["updated_count"] == 1

        # 7. Confirm Import (Import all selected transactions, including credits)
        # The confirm endpoint should save all selected transactions into expenses table
        confirm_payload = {"payment_method": "UPI"}
        confirm_resp = await client.post(
            f"/api/expenses/statement/{import_id}/confirm", 
            json=confirm_payload, 
            headers=headers
        )
        assert confirm_resp.status_code == 200
        assert confirm_resp.json()["data"]["imported_count"] == 3 # Zomato, Netflix, and Salary

        # Verify expenses are now present in user account
        expenses_resp = await client.get("/api/expenses", headers=headers)
        assert expenses_resp.status_code == 200
        expenses = expenses_resp.json()["data"]
        assert len(expenses) == 3
        
        # Verify categories, amounts and natures
        zomato_exp = next(e for e in expenses if "zomato" in e["merchant"].lower())
        netflix_exp = next(e for e in expenses if "netflix" in e["merchant"].lower())
        salary_exp = next(e for e in expenses if "salary" in e["merchant"].lower())

        assert zomato_exp["amount"] == 150.00
        assert zomato_exp["category"] == "FOOD"
        assert zomato_exp["nature"] == "EXPENSE"
        
        assert netflix_exp["amount"] == 499.00
        assert netflix_exp["category"] == "SUBSCRIPTION"
        assert netflix_exp["nature"] == "EXPENSE"

        assert salary_exp["amount"] == 60000.00
        assert salary_exp["category"] == "SALARY"
        assert salary_exp["nature"] == "INCOME"
