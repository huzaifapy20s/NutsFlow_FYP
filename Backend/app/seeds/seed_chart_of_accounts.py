from app import create_app
from app.models import ChartOfAccount, ChartAccountType, db


def main() -> None:
    app = create_app()

    with app.app_context():
        # Define the basic chart of accounts structure
        accounts_data = [
            # ASSETS
            ("1000", "Cash", ChartAccountType.ASSET, None),
            ("1010", "Bank Account", ChartAccountType.ASSET, None),
            ("1100", "Accounts Receivable", ChartAccountType.ASSET, None),
            ("1200", "Inventory", ChartAccountType.ASSET, None),
            ("1500", "Fixed Assets", ChartAccountType.ASSET, None),
            
            # LIABILITIES
            ("2000", "Accounts Payable", ChartAccountType.LIABILITY, None),
            ("2100", "Short-term Loans", ChartAccountType.LIABILITY, None),
            ("2500", "Long-term Debt", ChartAccountType.LIABILITY, None),
            
            # EQUITY
            ("3000", "Capital", ChartAccountType.EQUITY, None),
            ("3100", "Retained Earnings", ChartAccountType.EQUITY, None),
            
            # INCOME
            ("4000", "Sales Revenue", ChartAccountType.INCOME, None),
            ("4100", "Service Revenue", ChartAccountType.INCOME, None),
            
            # COGS
            ("5000", "Cost of Goods Sold", ChartAccountType.COGS, None),
            
            # EXPENSES
            ("6000", "Operating Expenses", ChartAccountType.EXPENSE, None),
            ("6100", "Salary Expense", ChartAccountType.EXPENSE, None),
            ("6200", "Utilities Expense", ChartAccountType.EXPENSE, None),
            ("6300", "Rent Expense", ChartAccountType.EXPENSE, None),
        ]

        created_count = 0
        for account_code, account_name, account_type, parent_id in accounts_data:
            existing = ChartOfAccount.query.filter_by(account_code=account_code).first()
            if not existing:
                chart_account = ChartOfAccount(
                    account_code=account_code,
                    account_name=account_name,
                    account_type=account_type,
                    parent_account_id=parent_id,
                    is_active=True,
                )
                db.session.add(chart_account)
                created_count += 1

        db.session.commit()
        print(f"Created {created_count} chart of accounts")

        # Show what was created
        all_accounts = ChartOfAccount.query.order_by(ChartOfAccount.account_code).all()
        print(f"\nTotal chart of accounts: {len(all_accounts)}")
        for account in all_accounts:
            print(f"  {account.account_code} - {account.account_name} ({account.account_type.value})")


if __name__ == "__main__":
    main()
