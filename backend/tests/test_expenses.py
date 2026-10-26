import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_expense_crud_workflow(client: AsyncClient) -> None:
    """Verifies complete Expense workflow: create, retrieve, update, and delete actions."""
    # 1. Register & Login to get token
    reg_payload = {
        "full_name": "Charlie Brown",
        "email": "charlie@finsight.ai",
        "password": "Password123!"
    }
    await client.post("/api/auth/register", json=reg_payload)

    login_payload = {
        "email": "charlie@finsight.ai",
        "password": "Password123!"
    }
    login_resp = await client.post("/api/auth/login", json=login_payload)
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Create Expense
    expense_payload = {
        "amount": 2500.50,
        "merchant": "Whole Foods Market",
        "category": "FOOD",
        "payment_method": "DEBIT_CARD",
        "expense_date": "2026-06-02",
        "notes": "Weekly groceries grocery shopping"
    }
    create_resp = await client.post("/api/expenses/manual", json=expense_payload, headers=headers)
    assert create_resp.status_code == 201
    
    create_body = create_resp.json()
    assert create_body["success"] is True
    assert create_body["data"]["amount"] == 2500.50
    assert create_body["data"]["merchant"] == "Whole Foods Market"
    expense_id = create_body["data"]["id"]

    # 3. Retrieve User Expenses
    get_resp = await client.get("/api/expenses", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["success"] is True
    assert len(get_resp.json()["data"]) >= 1

    # 4. Update Expense Notes
    update_payload = {
        "notes": "Weekly groceries grocery shopping - Updated"
    }
    update_resp = await client.put(f"/api/expenses/{expense_id}", json=update_payload, headers=headers)
    assert update_resp.status_code == 200
    assert update_resp.json()["data"]["notes"] == "Weekly groceries grocery shopping - Updated"

    # 5. Delete Expense
    delete_resp = await client.delete(f"/api/expenses/{expense_id}", headers=headers)
    assert delete_resp.status_code == 200
    assert delete_resp.json()["success"] is True

    # 6. Retrieve again, should be empty
    get_resp_final = await client.get("/api/expenses", headers=headers)
    assert len(get_resp_final.json()["data"]) == 0


@pytest.mark.asyncio
async def test_expense_analytics_summary(client: AsyncClient, db_session: AsyncSession) -> None:
    """Verifies analytics summary calculations for monthly and yearly income/expense metrics."""
    # 1. Register & Login
    reg_payload = {
        "full_name": "Dave Smith",
        "email": "dave@finsight.ai",
        "password": "Password123!"
    }
    await client.post("/api/auth/register", json=reg_payload)

    login_payload = {
        "email": "dave@finsight.ai",
        "password": "Password123!"
    }
    login_resp = await client.post("/api/auth/login", json=login_payload)
    token = login_resp.json()["data"]["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Retrieve current user to associate with expense/income
    from models.user import User
    from sqlalchemy import select
    user_res = await db_session.execute(select(User).where(User.email == "dave@finsight.ai"))
    user = user_res.scalars().first()
    assert user is not None

    # Insert an EXPENSE and an INCOME directly
    from app.modules.expenses.models import Expense, ExpenseCategory, PaymentMethod
    import datetime
    
    today = datetime.date.today()
    
    expense_item = Expense(
        user_id=user.id,
        amount=1500.00,
        merchant="Target",
        category=ExpenseCategory.SHOPPING,
        payment_method=PaymentMethod.DEBIT_CARD,
        expense_date=today,
        nature="EXPENSE"
    )
    income_item = Expense(
        user_id=user.id,
        amount=5000.00,
        merchant="Stripe",
        category=ExpenseCategory.SALARY,
        payment_method=PaymentMethod.NET_BANKING,
        expense_date=today,
        nature="INCOME"
    )
    
    db_session.add(expense_item)
    db_session.add(income_item)
    await db_session.commit()

    # Call the analytics summary endpoint
    summary_resp = await client.get("/api/expenses/analytics/summary", headers=headers)
    assert summary_resp.status_code == 200
    
    summary_data = summary_resp.json()["data"]
    
    # Verify Monthly Metrics
    assert summary_data["this_month"]["total_amount"] == 1500.00
    assert summary_data["this_month"]["total_income"] == 5000.00
    assert summary_data["this_month"]["net_cashflow"] == 3500.00
    
    # Verify Yearly Metrics (our new feature!)
    assert summary_data["this_year"]["total_amount"] == 1500.00
    assert summary_data["this_year"]["total_income"] == 5000.00
    assert summary_data["this_year"]["net_cashflow"] == 3500.00

