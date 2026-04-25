import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import {
  BarChart3,
  Boxes,
  CheckSquare,
  Eye,
  EyeOff,
  Globe,
  Headphones,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { loginUser, setLoginField } from "../../features/auth/authSlice";
import logo from "../../../logo.png";

function FeatureItem({ icon: Icon, title, description }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#f3e6d2] bg-white/70 p-3 backdrop-blur-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fff4df] text-[#f0ab3d]">
        <Icon size={20} />
      </div>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function InputField({ label, type, value, onChange, placeholder, icon: Icon, rightNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-800">{label}</label>
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition focus-within:border-[#f0b44c] focus-within:ring-4 focus-within:ring-[#fff3d9]">
        <Icon size={20} className="shrink-0 text-slate-400" />
        <input
          className="w-full border-none bg-transparent p-0 text-sm text-slate-700 outline-none focus:ring-0"
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
        />
        {rightNode}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const dispatch = useDispatch();
  const { accessToken, loginForm, loading, error } = useSelector((state) => state.auth);

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  if (accessToken) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    dispatch(loginUser());
  };

  return (
    <div className="min-h-screen bg-[#fbfbfb] text-slate-900">
      <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        {/* Left Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#fffaf1] via-[#fffdf8] to-[#fff6e6] px-6 py-8 sm:px-10 lg:px-14 xl:px-16">
          <div className="absolute inset-y-0 right-0 hidden w-px bg-gradient-to-b from-transparent via-[#f1dfc0] to-transparent lg:block" />
          <div className="absolute left-[-60px] top-[120px] h-40 w-40 rounded-full bg-[#ffe7b7]/35 blur-3xl" />
          <div className="absolute bottom-12 left-[-10px] h-56 w-56 rounded-full border border-[#f3dfb7] opacity-40" />
          {/* <div className="absolute right-10 top-10 h-60 w-60 rounded-full border border-[#f5e5c8] opacity-50">
           <img src={logo} alt="Nuts Flow ERP" className="h-full w-full object-contain" />
          </div> */}
          <div className="absolute bottom-0 right-0 h-56 w-56 rounded-tl-[100px] bg-[radial-gradient(circle_at_bottom_right,rgba(240,180,76,0.18),transparent_58%)]" />

          <div className="relative z-10 mx-auto flex h-full w-full max-w-3xl flex-col">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-[0_18px_40px_rgba(240,180,76,0.18)] ring-1 ring-[#f5e6c8]">
                <img src={logo} alt="Nuts Flow ERP" className="h-12 w-12 object-contain" />
              </div>

              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Nuts Flow
                </h1>
                <p className="text-lg font-medium tracking-[0.32em] text-[#f0ab3d]">ERP</p>
              </div>
            </div>

            <div className="mt-12  lg:mt-6">
              <h2 className="text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
                Smart ERP
                &
                <span className="text-[#efb34b]"> Seamless Growth.</span>
              </h2>

              <p className="mt-2 max-w-lg text-lg leading-8 text-slate-500">
                Manage your business operations, finances, inventory, and more all in one
                place.
              </p>
            </div>

            {/* Dashboard Mock Card */}
            <div className="relative mt-2 w-full max-w-2xl rounded-[28px] border border-white/70 bg-white/75 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-6">
              {/* <div className="absolute -left-6 -top-6 hidden rounded-[24px] bg-white p-4 shadow-[0_16px_45px_rgba(15,23,42,0.12)] lg:block">
                <div className="flex items-end gap-2">
                  <div className="h-14 w-14 rounded-lg bg-[#d6a059]" />
                  <div className="mb-3 h-10 w-10 rounded-lg bg-[#e7c18c]" />
                </div>
                <div className="mt-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#ffefcf] text-[#e3a43c] shadow-inner">
                  <span className="text-2xl font-bold">$</span>
                </div>
              </div> */}

              {/* <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex w-12 flex-col gap-2 rounded-2xl bg-[#1f2c45] p-2">
                    <div className="h-8 rounded-lg bg-white/15" />
                    <div className="h-8 rounded-lg bg-[#f0b44c]" />
                    <div className="h-8 rounded-lg bg-white/15" />
                    <div className="h-8 rounded-lg bg-white/15" />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">Dashboard</p>
                    <p className="text-xs text-slate-400">Overview of business performance</p>
                  </div>
                </div>

                <div className="hidden items-center gap-2 sm:flex">
                  <div className="h-9 w-24 rounded-xl bg-slate-100" />
                  <div className="h-9 w-9 rounded-full bg-slate-100" />
                </div>
              </div> */}

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {[
                  { label: "Total Revenue", value: "$ 8,745,230", growth: "+ 12.5% from last month" },
                  { label: "Total Orders", value: "1,250", growth: "+ 8.2% from last month" },
                  { label: "Inventory Value", value: "$ 2,345,670", growth: "+ 5.4% from last month" },
                ].map((card) => (
                  <div
                    key={card.label}
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                  >
                    <p className="text-xs font-medium text-slate-400">{card.label}</p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
                    <p className="mt-2 text-xs font-medium text-emerald-500">{card.growth}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-700">Sales Overview</p>
                    <BarChart3 size={18} className="text-[#f0b44c]" />
                  </div>

                  <div className="mt-6 flex h-40 items-end gap-4 rounded-2xl bg-[linear-gradient(180deg,#fff,rgba(255,248,233,0.85))] p-4">
                    {[30, 54, 47, 75, 42, 70, 98].map((height, index) => (
                      <div key={index} className="flex flex-1 flex-col items-center gap-3">
                        <div className="relative flex w-full flex-1 items-end">
                          <div
                            className="w-full rounded-t-full bg-gradient-to-t from-[#f0b44c] to-[#ffd980]"
                            style={{ height: `${height}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"][index]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                  <p className="text-sm font-semibold text-slate-700">Top Categories</p>

                  <div className="mt-4 flex items-center justify-center">
                    <div className="relative flex h-36 w-36 items-center justify-center rounded-full bg-[conic-gradient(#f0b44c_0_38%,#f4cc82_38%_62%,#f7ddb0_62%_82%,#ead8c1_82%_100%)]">
                      <div className="h-20 w-20 rounded-full bg-white" />
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {[
                      ["Nuts", "#f0b44c"],
                      ["Dried Fruits", "#f4cc82"],
                      ["Seeds", "#f7ddb0"],
                      ["Others", "#ead8c1"],
                    ].map(([label, color]) => (
                      <div
                        key={label}
                        className="flex items-center justify-between text-sm text-slate-500"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          {label}
                        </div>
                        <span className="text-slate-400">•</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Features */}
            {/* <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <FeatureItem
                icon={CheckSquare}
                title="Real-time Insights"
                description="Make smarter decisions with live data."
              />
              <FeatureItem
                icon={ShieldCheck}
                title="Secure & Reliable"
                description="Enterprise-grade security you can trust."
              />
              <FeatureItem
                icon={Boxes}
                title="All-in-One Solution"
                description="Streamline operations and boost productivity."
              />
            </div> */}

            {/* <p className="mt-auto pt-8 text-sm text-slate-400">
              © 2024 Nuts Flow ERP. All rights reserved.
            </p> */}
          </div>
        </section>

        {/* Right Section */}
        <section className="relative flex items-start justify-center px-6 py-8 sm:px-10 lg:px-12">
          {/* <div className="absolute right-6 top-6 sm:right-10 sm:top-10">
            <button
              type="button"
              className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 shadow-sm"
            >
              <Globe size={18} />
              English
            </button>
          </div> */}

          <div className="w-full max-w-xl rounded-[32px] border border-slate-200 bg-white px-6 py-8 shadow-[0_25px_80px_rgba(15,23,42,0.08)] sm:px-10 sm:py-10  lg:mt-4">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full  shadow-inner ring-1 ring-[#f5e4c5]">
              <img src={logo} alt="Nuts Flow ERP" className="h-12 w-12 object-contain" />
            </div>

            <div className="mt-6 text-center">
              <h2 className="text-4xl font-bold tracking-tight text-slate-900">Welcome back</h2>
              <p className="mt-3 text-lg text-slate-500">
                Sign in to continue to Nuts Flow ERP
              </p>
            </div>

            <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
              <InputField
                label="Email Address"
                type="email"
                value={loginForm.email}
                onChange={(e) =>
                  dispatch(setLoginField({ field: "email", value: e.target.value }))
                }
                placeholder="Enter your email address"
                icon={Mail}
              />

              <InputField
                label="Password"
                type={showPassword ? "text" : "password"}
                value={loginForm.password}
                onChange={(e) =>
                  dispatch(setLoginField({ field: "password", value: e.target.value }))
                }
                placeholder="Enter your password"
                icon={LockKeyhole}
                rightNode={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                }
              />

              <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <label className="flex cursor-pointer items-center gap-3 text-slate-600">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe((prev) => !prev)}
                    className="h-5 w-5 rounded-md border border-[#efc46e] accent-[#f0b44c]"
                  />
                  <span>Remember me</span>
                </label>

                {/* <button
                  type="button"
                  className="font-medium text-[#f0a53c] hover:text-[#df9223]"
                >
                  Forgot Password?
                </button> */}
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}

              <button
                className="w-full rounded-2xl bg-gradient-to-r from-[#efb34b] to-[#ffd271] px-4 py-4 text-lg font-semibold text-slate-900 shadow-[0_16px_30px_rgba(240,180,76,0.28)] transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(240,180,76,0.32)] disabled:cursor-not-allowed disabled:opacity-70"
                type="submit"
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            <div className="my-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="text-sm font-medium text-slate-400">or</span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

 <a
  href="https://wa.me/923293366565"
  target="_blank"
  rel="noopener noreferrer"
  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#eee4d5] bg-[#fffaf3] px-4 py-4 text-base font-medium text-slate-700 transition hover:bg-[#fff7eb]"
>
  <Headphones size={20} className="text-slate-500" />
  Need help? <span className="text-[#f0a53c]">Contact admin</span>
</a>
          </div>
        </section>
      </div>
    </div>
  );
}