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
      setError("Zadejte heslo");
      return;
    }

    startTransition(async () => {
      if (isAdminLogin) {
        const res = await loginAdmin(password);
        if (res.error) {
          setError("Neplatné administrátorské heslo");
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

        setError("Neplatné přístupové heslo");
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

  // Design Theme colors mapping
  const accentColor = isAdminLogin ? "text-[#c9c7b9]" : "text-[#4f6272]";
  const buttonBg = isAdminLogin ? "bg-[#c9c7b9] text-[#1c1d1f] hover:bg-white" : "bg-[#4f6272] text-white hover:bg-white hover:text-[#1c1d1f]";
  const focusBorder = isAdminLogin ? "focus:border-[#c9c7b9]" : "focus:border-[#4f6272]";

  return (
    <div className="min-h-screen bg-[#0d0e10] text-[#ffffff] font-mono flex flex-col items-center justify-center relative overflow-hidden px-4 selection:bg-[#4f6272] selection:text-white">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-gradient-to-b from-indigo-500/5 via-teal-500/2 to-transparent blur-[120px] pointer-events-none -z-10" />

      {/* Main Login Card - made shorter (min-h-[290px]) */}
      <div className="w-full max-w-sm bg-[#1c1d1f] border border-[#2b2c2f]/40 p-5 sm:p-6 rounded shadow-2xl relative z-10 flex flex-col justify-between min-h-[300px]">
        
        {/* Card Header - simplified, no icon, no title, just subtitle */}
        <div className="text-center mb-2">
          <p className={`text-xs font-bold uppercase tracking-widest ${accentColor}`}>
            {isAdminLogin ? "VSTUP PRO SPRÁVCE" : "VSTUP PRO MUDLI"}
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4 my-4 flex-1 flex flex-col justify-center">
          {error && (
            <div className="bg-rose-950/20 border border-rose-500/20 text-rose-400 p-2.5 rounded text-[10px] font-bold tracking-wide uppercase text-center">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
              PŘÍSTUPOVÉ HESLO
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-[#131416] border border-[#2b2c2f] rounded pl-3 pr-10 py-2.5 text-white placeholder-zinc-800 focus:outline-none transition-colors text-xs font-mono ${focusBorder}`}
                required
                disabled={isPending}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors focus:outline-none"
              >
                {showPassword ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className={`w-full font-bold py-3 px-4 rounded transition-all duration-200 text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 ${buttonBg} disabled:opacity-40`}
          >
            {isPending ? (
              <span>OVĚŘUJI...</span>
            ) : (
              <>
                <span>VSTOUPIT</span>
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        {/* Toggle between admin/portal logins */}
        <div className="border-t border-[#232427] pt-3 text-center">
          <button
            onClick={toggleRole}
            type="button"
            className="text-[9px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors cursor-pointer"
          >
            {isAdminLogin
              ? "← VSTUP PRO MUDLI"
              : "VSTUP PRO SPRÁVCE →"}
          </button>
        </div>
      </div>

      <div className="max-w-md w-full text-center mt-4 text-[9px] text-zinc-700 font-bold uppercase tracking-widest leading-relaxed">
        Administrativní portál SVJ. Nepovolený přístup je přísně zakázán.
      </div>
    </div>
  );
}
