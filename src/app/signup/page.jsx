"use client";

import { useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  updateProfile,
} from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth, db } from "@/lib/firebase";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [enumeratorId, setEnumeratorId] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace("/census-2027/data");
      } else {
        setCheckingAuth(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSignup = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    // Validation
    if (!name.trim()) {
      setError("আপনার নাম দিন।");
      return;
    }

    if (!enumeratorId.trim()) {
      setError("Enumerator ID দিন।");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setError("সঠিক ১০ সংখ্যার মোবাইল নম্বর দিন।");
      return;
    }

    if (!email.trim()) {
      setError("Email address দিন।");
      return;
    }

    if (password.length < 6) {
      setError("Password কমপক্ষে ৬ অক্ষরের হতে হবে।");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password এবং Confirm Password একই নয়।");
      return;
    }

    try {
      setLoading(true);

      // Create Firebase account
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );

      const user = credential.user;

      // Set display name
      await updateProfile(user, {
        displayName: name.trim(),
      });

      // Store enumerator profile in Firestore
      await setDoc(doc(db, "enumerators", user.uid), {
        uid: user.uid,
        name: name.trim(),
        enumeratorId: enumeratorId.trim(),
        mobile: mobile,
        email: email.trim().toLowerCase(),

        role: "enumerator",

        status: "active",

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp(),
      });

      router.replace("/census-2027");
    } catch (error) {
      console.error("Signup error:", error);

      let message = "Account তৈরি করা যায়নি। আবার চেষ্টা করুন।";

      switch (error.code) {
        case "auth/email-already-in-use":
          message = "এই Email address দিয়ে ইতিমধ্যে একটি account আছে।";
          break;

        case "auth/invalid-email":
          message = "সঠিক Email address দিন।";
          break;

        case "auth/weak-password":
          message = "Password আরও শক্তিশালী করুন।";
          break;

        case "auth/network-request-failed":
          message = "Internet connection পরীক্ষা করুন।";
          break;

        case "auth/operation-not-allowed":
          message =
            "Firebase Console-এ Email/Password Authentication চালু করুন।";
          break;

        default:
          message = error.message || "Account তৈরি করা যায়নি।";
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
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gradient-to-br from-green-50 via-white to-green-100 px-4 py-8">
      <div className="w-full max-w-md">
        {/* BRAND */}

        <div className="mb-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-800 text-3xl font-black text-white shadow-lg">
            C
          </div>

          <h1 className="mt-4 text-2xl font-bold text-gray-800">Census 2027</h1>

          <p className="mt-1 text-sm text-gray-500">
            Household Data Collection System
          </p>
        </div>

        {/* CARD */}

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xl sm:p-7">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800">
              Create Enumerator Account
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              নতুন গণনাকারী account তৈরি করুন।
            </p>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            {/* NAME */}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                গণনাকারীর নাম
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="পূর্ণ নাম"
                autoComplete="name"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
              />
            </div>

            {/* ENUMERATOR ID */}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Enumerator ID
              </label>

              <input
                type="text"
                value={enumeratorId}
                onChange={(e) => setEnumeratorId(e.target.value.toUpperCase())}
                placeholder="যেমন: ENM001"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm uppercase outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
              />
            </div>

            {/* MOBILE */}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                মোবাইল নম্বর
              </label>

              <input
                type="tel"
                value={mobile}
                onChange={(e) =>
                  setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="১০ সংখ্যার মোবাইল নম্বর"
                inputMode="numeric"
                maxLength={10}
                autoComplete="tel"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
              />
            </div>

            {/* EMAIL */}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Email Address
              </label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="enumerator@example.com"
                autoComplete="email"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
              />
            </div>

            {/* PASSWORD */}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pr-16 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
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

            {/* CONFIRM PASSWORD */}

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                Confirm Password
              </label>

              <input
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Password আবার লিখুন"
                autoComplete="new-password"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:bg-gray-100"
              />
            </div>

            {/* INFO */}

            <div className="rounded-lg bg-green-50 p-3 text-xs leading-5 text-green-800">
              <p className="font-bold">Account তৈরির পরে:</p>

              <p className="mt-1">
                আপনার Enumerator profile এবং authentication information
                নিরাপদভাবে সংরক্ষণ করা হবে।
              </p>
            </div>

            {/* SUBMIT */}

            {/* <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-green-700 px-5 py-3 font-bold text-white shadow-md transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Account তৈরি হচ্ছে..." : "Create Account"}
            </button> */}
          </form>

          {/* LOGIN LINK */}

          <div className="mt-6 border-t border-gray-100 pt-5 text-center">
            <p className="text-sm text-gray-500">ইতিমধ্যে account আছে?</p>

            <Link
              href="/login"
              className="mt-1 inline-block text-sm font-bold text-green-700 hover:text-green-800"
            >
              Login করুন →
            </Link>
          </div>

          <div className="mt-3 text-center">
            <Link
              href="/"
              className="text-xs text-gray-500 hover:text-green-700"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
