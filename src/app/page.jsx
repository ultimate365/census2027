"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

import { auth } from "@/lib/firebase";

export default function HomePage() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

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

      // Authentication state will update automatically.
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

  /* ---------------------------------------------
     AUTH CHECK
  --------------------------------------------- */

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

  /* ---------------------------------------------
     NOT LOGGED IN
  --------------------------------------------- */

  if (!user) {
    return (
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-100 px-4 py-8">
        <div className="w-full max-w-md">
          {/* BRAND */}

          <div className="mb-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-green-800 text-4xl font-black text-white shadow-xl">
              C
            </div>

            <h1 className="mt-5 text-3xl font-black text-gray-800">
              Census 2027
            </h1>

            <p className="mt-2 text-sm text-gray-500">
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
                Please sign in to access the Census 2027 data collection system.
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
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Password
                </label>

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

              {/* LOGIN BUTTON */}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-green-700 px-5 py-3.5 font-bold text-white shadow-md transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>

            {/* SIGN UP */}

            <div className="mt-6 border-t border-gray-100 pt-5 text-center">
              <p className="text-sm text-gray-500">নতুন গণনাকারী?</p>

              <Link
                href="/signup"
                className="mt-1 inline-block text-sm font-bold text-green-700 hover:text-green-800"
              >
                Create an Enumerator Account →
              </Link>
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

  /* ---------------------------------------------
     LOGGED IN HOME
  --------------------------------------------- */

  return (
    <main className="min-h-screen bg-gray-50">
      {/* HERO */}

      <section className="bg-gradient-to-br from-green-950 via-green-800 to-green-600">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-white">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold">
                <span className="h-2 w-2 rounded-full bg-green-300" />
                AUTHENTICATED
              </div>

              <h1 className="text-3xl font-black sm:text-4xl lg:text-5xl">
                Welcome to Census 2027
              </h1>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-green-100 sm:text-base">
                Household Data Collection System
              </p>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-green-50">
                You are signed in and can now collect, view and manage household
                information.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/census-2027"
                  className="rounded-xl bg-white px-6 py-3 text-center text-sm font-bold text-green-800 shadow-lg transition hover:bg-green-50"
                >
                  + New Household Data
                </Link>

                <Link
                  href="/census-2027/data"
                  className="rounded-xl border border-white/30 bg-white/10 px-6 py-3 text-center text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                >
                  View / Manage Data
                </Link>
              </div>
            </div>

            {/* USER CARD */}

            <div className="w-full max-w-md lg:w-96">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-5 backdrop-blur">
                <div className="rounded-xl bg-white p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-700">
                      {(user.displayName || user.email || "U")
                        .charAt(0)
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs text-gray-500">Logged in as</p>

                      <p className="truncate font-bold text-gray-800">
                        {user.displayName || "Enumerator"}
                      </p>

                      <p className="truncate text-xs text-gray-500">
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-green-50 p-3">
                      <p className="text-xs text-gray-500">Status</p>

                      <p className="mt-1 text-sm font-bold text-green-700">
                        Active
                      </p>
                    </div>

                    <div className="rounded-lg bg-blue-50 p-3">
                      <p className="text-xs text-gray-500">Survey</p>

                      <p className="mt-1 text-sm font-bold text-blue-700">
                        2027
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* DASHBOARD OPTIONS */}

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-7">
          <p className="text-sm font-bold uppercase tracking-widest text-green-700">
            Quick Access
          </p>

          <h2 className="mt-1 text-2xl font-bold text-gray-800">
            Census Operations
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <DashboardCard
            href="/census-2027"
            icon="📝"
            title="New Data Collection"
            description="Enter and submit household information for a new Census 2027 household."
            button="Start Collection"
          />

          <DashboardCard
            href="/census-2027/data"
            icon="📊"
            title="View & Manage Data"
            description="Search, view and modify previously submitted household records."
            button="Manage Records"
          />
        </div>
      </section>

      {/* INFORMATION */}

      <section className="border-y border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
            <InfoCard
              icon="🔐"
              title="Secure Access"
              text="Only authenticated users can access the Census data collection system."
            />

            <InfoCard
              icon="📍"
              title="GPS Support"
              text="Household location can be captured using the device GPS."
            />

            <InfoCard
              icon="☁️"
              title="Cloud Database"
              text="Submitted household records are stored in Firebase Firestore."
            />
          </div>
        </div>
      </section>

      {/* FOOTER */}

      <footer className="bg-gray-950 px-4 py-7 text-center text-gray-400">
        <p className="font-bold text-white">Census 2027</p>

        <p className="mt-1 text-xs">Household Data Collection System</p>
      </footer>
    </main>
  );
}

/* --------------------------------------------------
   DASHBOARD CARD
-------------------------------------------------- */

function DashboardCard({ href, icon, title, description, button }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-green-200 hover:shadow-lg"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-green-50 text-2xl">
          {icon}
        </div>

        <span className="text-xl text-gray-300 transition group-hover:text-green-600">
          →
        </span>
      </div>

      <h3 className="mt-5 text-lg font-bold text-gray-800">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">{description}</p>

      <div className="mt-5 text-sm font-bold text-green-700">{button} →</div>
    </Link>
  );
}

/* --------------------------------------------------
   INFO CARD
-------------------------------------------------- */

function InfoCard({ icon, title, text }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
        {icon}
      </div>

      <h3 className="mt-4 font-bold text-gray-800">{title}</h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">{text}</p>
    </div>
  );
}
