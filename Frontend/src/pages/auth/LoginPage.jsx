import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { loginUser, setLoginField } from "../../features/auth/authSlice";

export default function LoginPage() {
  const dispatch = useDispatch();
  const { accessToken, loginForm, loading, error } = useSelector((state) => state.auth);

  if (accessToken) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    dispatch(loginUser());
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
        <h1 className="text-3xl font-bold">Sign in</h1>
        <p className="mt-2 text-sm text-slate-500">Dry Fruit Management System</p>

        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              value={loginForm.email}
              onChange={(e) => dispatch(setLoginField({ field: "email", value: e.target.value }))}
              placeholder="admin@example.com"
            />
          </div>

          <div>
            <label className="label">Password</label>
            <input
              type="password"
              value={loginForm.password}
              onChange={(e) => dispatch(setLoginField({ field: "password", value: e.target.value }))}
              placeholder="••••••••"
            />
          </div>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button className="primary-btn w-full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}