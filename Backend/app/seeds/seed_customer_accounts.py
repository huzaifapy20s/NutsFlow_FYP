from app import create_app
from app.models import Customer, FinancialAccount, ChartOfAccount, FinancialAccountType, db


def main() -> None:
    app = create_app()

    with app.app_context():
        # Get Accounts Receivable chart account
        chart_account = ChartOfAccount.query.filter_by(account_code="1100").first()
        if not chart_account:
            print("Accounts Receivable chart account not found.")
            return

        customers = Customer.query.filter_by(is_active=True).all()
        created_count = 0
        for customer in customers:
            # Check if financial account already exists
            existing = FinancialAccount.query.filter(
                FinancialAccount.account_name.like(f"Customer {customer.id}:%")
            ).first()
            if not existing:
                financial_account = FinancialAccount(
                    account_name=f"Customer {customer.id}: {customer.full_name}",
                    account_type=FinancialAccountType.ASSET,
                    chart_account_id=chart_account.id,
                    opening_balance=customer.opening_balance,
                    current_balance=customer.opening_balance,
                )
                db.session.add(financial_account)
                created_count += 1

        db.session.commit()
        print(f"Created {created_count} financial accounts for existing customers.")


if __name__ == "__main__":
    main()