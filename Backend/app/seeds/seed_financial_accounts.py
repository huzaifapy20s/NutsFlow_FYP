from decimal import Decimal

from app import create_app
from app.models import ChartOfAccount, FinancialAccount, FinancialAccountType, db


def main() -> None:
    app = create_app()

    with app.app_context():
        # Find asset accounts (cash and banks are asset types)
        asset_accounts = ChartOfAccount.query.filter_by(
            account_type="asset"
        ).filter(
            ChartOfAccount.account_name.ilike("%cash%") |
            ChartOfAccount.account_name.ilike("%bank%")
        ).all()

        created_count = 0

        # Create financial accounts for cash/bank chart accounts
        for chart_account in asset_accounts:
            existing = FinancialAccount.query.filter_by(
                chart_account_id=chart_account.id
            ).first()
            if not existing:
                account_type = FinancialAccountType.BANK if "bank" in chart_account.account_name.lower() else FinancialAccountType.CASH
                financial_account = FinancialAccount(
                    account_name=chart_account.account_name,
                    account_type=account_type,
                    chart_account_id=chart_account.id,
                    account_number="12345678" if account_type == FinancialAccountType.BANK else None,
                    bank_name="Default Bank" if account_type == FinancialAccountType.BANK else None,
                    opening_balance=Decimal("100000.00"),
                    current_balance=Decimal("100000.00"),
                    is_active=True,
                )
                db.session.add(financial_account)
                created_count += 1

        # If no cash/bank accounts found, create defaults from first asset accounts
        if created_count == 0:
            asset_accounts = ChartOfAccount.query.filter_by(
                account_type="asset"
            ).limit(2).all()

            for i, chart_account in enumerate(asset_accounts):
                existing = FinancialAccount.query.filter_by(
                    chart_account_id=chart_account.id
                ).first()
                if not existing:
                    account_type = FinancialAccountType.CASH if i == 0 else FinancialAccountType.BANK
                    financial_account = FinancialAccount(
                        account_name=f"{'Cash' if i == 0 else 'Bank'} - {chart_account.account_name}",
                        account_type=account_type,
                        chart_account_id=chart_account.id,
                        account_number="12345678" if i > 0 else None,
                        bank_name="Default Bank" if i > 0 else None,
                        opening_balance=Decimal("100000.00"),
                        current_balance=Decimal("100000.00"),
                        is_active=True,
                    )
                    db.session.add(financial_account)
                    created_count += 1

        db.session.commit()
        print(f"Created {created_count} financial accounts")

        # Show what was created
        all_accounts = FinancialAccount.query.all()
        print(f"\nTotal financial accounts: {len(all_accounts)}")
        for account in all_accounts:
            print(f"  - {account.account_name} ({account.account_type.value}): {account.current_balance}")


if __name__ == "__main__":
    main()
