import { BarChart3, Box, LayoutDashboard, Receipt, ShoppingCart, Store, Users, Wallet, Landmark, FileText } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/items", label: "Items", icon: Box },
  { to: "/customers", label: "Customers", icon: Users },
  { to: "/suppliers", label: "Suppliers", icon: Store },
  { to: "/purchases", label: "Purchases", icon: Receipt },
  { to: "/sales/pos", label: "POS", icon: ShoppingCart },
  { to: "/bills", label: "Bills", icon: FileText },
  { to: "/expenses", label: "Expenses", icon: Wallet },
  { to: "/accounts", label: "Accounts", icon: Landmark },
  { to: "/reports/profit-loss", label: "P/L Report", icon: BarChart3 },
  { to: "/reports/sales", label: "Sales Report", icon: BarChart3 },
  { to: "/reports/stock", label: "Stock Report", icon: BarChart3 },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <>
      <aside className="hidden w-72 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="p-6">
          <h1 className="text-xl font-bold">Dry Fruit MS</h1>
          <p className="mt-1 text-sm text-slate-500">Vite + React + Redux</p>
        </div>

        <nav className="space-y-1 px-4 pb-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.to === "/" ? location.pathname === "/" : location.pathname === item.to;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                  isActive ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}