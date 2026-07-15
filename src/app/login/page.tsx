"use client";

import React, { useState, useEffect, useTransition } from "react";
import { loginAdmin, loginPortal } from "../actions";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isAdminLogin, setIsAdminLogin] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setIsAdminLogin(params.get("admin") === "1");
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError("Password is required");
      return;
    }

    startTransition(async () => {
      if (isAdminLogin) {
        const res = await loginAdmin(password);
        if (res.error) {
          setError(res.error);
        } else {
          window.location.href = "/admin";
        }
      } else {
        // Try portal login first
        const portalRes = await loginPortal(password);
        if (!portalRes.error) {
          window.location.href = "/";
          return;
        }

        // Try admin login second (allows admin easy access to portal)
        const adminRes = await loginAdmin(password);
        if (!adminRes.error) {
          window.location.href = "/";
          return;
        }

        setError("Invalid password");
      }
    });
  };

  const toggleRole = () => {
    setError(null);
    setPassword("");
    const newIsAdmin = !isAdminLogin;
    setIsAdminLogin(newIsAdmin);
    if (typeof window !== "undefined") {
      const newUrl = new URL(window.location.href);
      if (newIsAdmin) {
        newUrl.searchParams.set("admin", "1");
      } else {
        newUrl.searchParams.delete("admin");
      }
      window.history.replaceState({}, "", newUrl.toString());
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center relative overflow-hidden px-4">
      {/* Glowing background accent gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-950/20 via-zinc-950 to-zinc-950 -z-10" />
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 blur-[80px] rounded-full pointer-events-none -z-10 transition-all duration-500 ${
        isAdminLogin ? "bg-rose-500/5" : "bg-teal-500/5"
      }`} />

      {/* Decorative top border glow */}
      <div className={`h-[2px] w-full max-w-md bg-gradient-to-r from-transparent to-transparent opacity-60 mb-8 transition-all duration-500 ${
        isAdminLogin ? "via-rose-500/50" : "via-teal-500/50"
      }`} />

      {/* Login Card Container */}
      <div className="w-full max-w-md bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-md shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-8">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-500 mb-4 ${
            isAdminLogin
              ? "bg-gradient-to-br from-rose-400 to-indigo-600 shadow-rose-500/25"
              : "bg-gradient-to-br from-teal-400 to-indigo-500 shadow-teal-500/25"
          }`}>
            {isAdminLogin ? (
              <svg className="w-6 h-6 text-zinc-950 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-zinc-950 font-bold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white transition-all duration-300">
            {isAdminLogin ? "Admin Access Required" : "House Portal Locked"}
          </h1>
          <p className="text-zinc-500 text-xs mt-1 uppercase font-bold tracking-wider">
            {isAdminLogin ? "SVJ Administration board" : "SVJ Job Logger"}
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          {error && (
            <div className="bg-rose-950/40 border border-rose-500/20 text-rose-300 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
              <svg className="w-5 h-5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2">
              {isAdminLogin ? "Administrator Password" : "House Portal Password"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-zinc-950/60 border border-zinc-800 rounded-xl pl-4 pr-12 py-3 text-white placeholder-zinc-700 focus:outline-none transition-colors text-sm ${
                  isAdminLogin ? "focus:border-rose-500" : "focus:border-teal-500"
                }`}
                required
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors focus:outline-none"
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className={`w-full text-white font-semibold py-3 px-4 rounded-xl shadow-lg active:scale-[0.98] transition-all duration-200 text-sm flex items-center justify-center gap-2 ${
              isAdminLogin
                ? "bg-gradient-to-r from-rose-500 to-indigo-600 hover:from-rose-400 hover:to-indigo-500 shadow-rose-500/10 hover:shadow-rose-500/20"
                : "bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 shadow-teal-500/10 hover:shadow-teal-500/20"
            }`}
          >
            {isPending ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying...
              </>
            ) : (
              <>
                {isAdminLogin ? "Unlock Admin Panel" : "Unlock Portal"}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 border-t border-zinc-800/80 pt-4 text-center">
          <button
            onClick={toggleRole}
            type="button"
            className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {isAdminLogin
              ? "Back to Worker Portal Login"
              : "Accessing Admin Board? Click here"}
          </button>
        </div>
      </div>

      <div className="max-w-md w-full text-center mt-6 text-[10px] text-zinc-600 font-medium">
        SVJ Portal Administrative Portal. Unauthorized access is strictly prohibited.
      </div>
    </div>
  );
}
