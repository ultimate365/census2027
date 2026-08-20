"use client";

import { useEffect, useState } from "react";

import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";

import { useRouter } from "next/navigation";

import Link from "next/link";

import { auth } from "@/lib/firebase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/census-2027/my-data");
      } else {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    if (!email.trim()) {
      setError("Email address দিন।");
      return;
    }

    if (!password) {
      setError("Password দিন।");
      return;
    }

    try {
      setLoading(true);

      await signInWithEmailAndPassword(auth, email.trim(), password);

      router.replace("/census-2027/my-data");
    } catch (error) {
      console.error("Login error:", error);

      let message = "Login করা যায়নি। আবার চেষ্টা করুন।";

      switch (error.code) {
        case "auth/invalid-email":
          message = "সঠিক Email address দিন।";
          break;

        case "auth/invalid-credential":
          message = "Email অথবা Password সঠিক নয়।";
          break;

        case "auth/user-not-found":
          message = "এই Email দিয়ে কোনো account পাওয়া যায়নি।";
          break;

        case "auth/wrong-password":
          message = "Password সঠিক নয়।";
          break;

        case "auth/too-many-requests":
          message = "অনেকবার ভুল Login হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।";
          break;

        case "auth/network-request-failed":
          message = "Internet connection পরীক্ষা করুন।";
          break;

        default:
          message = "Login করা যায়নি। আবার চেষ্টা করুন।";
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) {
    return (
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-700" />

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Checking authentication...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-100 px-4 py-10">
      <div className="w-full max-w-md">
        {/* LOGO / BRAND */}

        <div className="mb-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-800 text-3xl font-black text-white shadow-lg">
            C
          </div>

          <h1 className="mt-4 text-2xl font-bold text-gray-800">Census 2027</h1>

          <p className="mt-1 text-sm text-gray-500">
            Household Data Collection System
          </p>
        </div>

        {/* LOGIN CARD */}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xl sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              Enumerator Login
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Continue to the Census data collection system.
            </p>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* EMAIL */}

            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="enumerator@example.com"
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
              />
            </div>

            {/* PASSWORD */}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-semibold text-gray-700">
                  Password
                </label>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-20 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  disabled={loading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-semibold text-green-700 hover:bg-green-50"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* LOGIN */}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-green-700 px-5 py-3 font-bold text-white shadow-md transition hover:bg-green-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 border-t border-gray-100 pt-5 text-center">
            {/* <p className="text-sm text-gray-500">নতুন গণনাকারী?</p>

            <Link
              href="/signup"
              className="mt-1 inline-block text-sm font-bold text-green-700 hover:text-green-800"
            >
              Create an Enumerator Account →
            </Link> */}

            <div className="mt-3">
              <Link
                href="/"
                className="text-xs text-gray-500 hover:text-green-700"
              >
                ← Back to Home
              </Link>
            </div>
          </div>
        </div>

        {/* FOOTER */}

        <p className="mt-5 text-center text-xs text-gray-500">
          Census 2027 Household Data Collection
        </p>
      </div>
    </main>
  );
}
