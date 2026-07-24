from pydantic import BaseModel


class DashboardOverviewResponse(BaseModel):
    total_assets: float
    total_liabilities: float
    net_worth: float
    monthly_expenses: float
    monthly_savings: float
    credit_utilization: float  # Percentage
    emi_burden: float          # Percentage
