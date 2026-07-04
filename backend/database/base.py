# Import Declarative Base for metadata loading
from database.session import Base

# Import all models so metadata collects them
# (We will create these model files in the next step)
from models.user import User
from models.session import Session
from models.otp import OTPVerification
from models.audit import AuditLog
from app.modules.expenses.models import Expense, ExpenseUpload, ExpenseInsight, StatementImport, StatementTransaction, MerchantCategoryMapping
from models.investment import Investment
from models.stock import Stock
from models.card import CreditCardCatalog, UserCreditCard
from models.merchant_category import MerchantCategory
from models.loan import Loan
from models.stock_analysis import StockAnalysis
from models.card_version import CreditCardVersion
from models.reward_usage import UserRewardUsage
from models.reward_audit import RewardRuleAudit
