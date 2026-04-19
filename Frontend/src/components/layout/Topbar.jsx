import { useDispatch, useSelector } from "react-redux";
import { logoutUser } from "../../features/auth/authSlice";

export default function Topbar() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Management Console</h2>
        <p className="text-sm text-slate-500">Fast POS and clean accounting overview.</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-slate-900">{user?.full_name || "User"}</p>
          <p className="text-xs uppercase tracking-wide text-slate-500">{user?.role || "-"}</p>
        </div>
        <button className="secondary-btn" onClick={() => dispatch(logoutUser())}>
          Logout
        </button>
      </div>
    </header>
  );
}