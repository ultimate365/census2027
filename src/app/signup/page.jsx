"use client";

import { useEffect, useState } from "react";

import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  // =====================================================
  // FORM STATE
  // =====================================================

  const [form, setForm] = useState({
    name: "",
    enumeratorId: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
    locality: "",
    village: "",
  });

  // =====================================================
  // UI STATE
  // =====================================================

  const [loading, setLoading] = useState(false);

  const [checkingAuth, setCheckingAuth] = useState(true);

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // =====================================================
  // CHECK EXISTING LOGIN
  // =====================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setCheckingAuth(false);
        return;
      }

      /*
       * If already logged in, check whether
       * a profile exists.
       */

      try {
        const profileRef = doc(db, "enumerators", currentUser.uid);

        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          router.replace("/");

          return;
        }

        /*
         * Auth user exists but profile
         * doesn't exist.
         *
         * We allow the user to remain
         * on signup page so the profile
         * can be created if appropriate.
         */
      } catch (error) {
        console.error("Profile check error:", error);
      }

      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  // =====================================================
  // INPUT HANDLER
  // =====================================================

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (message) {
      setMessage("");
      setMessageType("");
    }
  };

  // =====================================================
  // VALIDATION
  // =====================================================

  const validateForm = () => {
    const name = form.name.trim();

    const enumeratorId = form.enumeratorId.trim();

    const locality = form.locality.trim();

    const village = form.village.trim();

    const mobile = form.mobile.trim();

    const email = form.email.trim().toLowerCase();

    const password = form.password;

    const confirmPassword = form.confirmPassword;

    // -----------------------------------------------
    // NAME
    // -----------------------------------------------

    if (!name) {
      return "আপনার পূর্ণ নাম লিখুন।";
    }

    if (name.length < 2) {
      return "সঠিক নাম লিখুন।";
    }

    // -----------------------------------------------
    // ENUMERATOR ID
    // -----------------------------------------------

    if (!enumeratorId) {
      return "Enumerator ID লিখুন।";
    }

    // -----------------------------------------------
    // LOCATION
    // -----------------------------------------------

    if (!locality) {
      return "Locality লিখুন।";
    }

    if (!village) {
      return "Village লিখুন।";
    }

    // -----------------------------------------------
    // MOBILE
    // -----------------------------------------------

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      return "সঠিক ১০ সংখ্যার ভারতীয় মোবাইল নম্বর দিন।";
    }

    // -----------------------------------------------
    // EMAIL
    // -----------------------------------------------

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return "সঠিক Email Address দিন।";
    }

    // -----------------------------------------------
    // PASSWORD
    // -----------------------------------------------

    if (password.length < 6) {
      return "Password কমপক্ষে ৬ অক্ষরের হতে হবে।";
    }

    // -----------------------------------------------
    // CONFIRM PASSWORD
    // -----------------------------------------------

    if (password !== confirmPassword) {
      return "Password এবং Confirm Password একই নয়।";
    }

    return "";
  };

  // =====================================================
  // SIGN UP
  // =====================================================

  const handleSignup = async (e) => {
    e.preventDefault();

    if (loading) return;

    setMessage("");
    setMessageType("");

    // -----------------------------------------------
    // VALIDATE
    // -----------------------------------------------

    const validationError = validateForm();

    if (validationError) {
      setMessage(validationError);

      setMessageType("error");

      return;
    }

    setLoading(true);

    try {
      const name = form.name.trim();

      const enumeratorId = form.enumeratorId.trim();

      const locality = form.locality.trim();

      const village = form.village.trim();

      const mobile = form.mobile.trim();

      const email = form.email.trim().toLowerCase();

      // =================================================
      // CREATE FIREBASE AUTH USER
      // =================================================

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        form.password,
      );

      const user = userCredential.user;

      console.log("Firebase Auth user created:", user.uid);

      // =================================================
      // IMPORTANT
      // =================================================
      //
      // Firestore document ID = Firebase Auth UID
      //
      // This fixes:
      //
      // Enumerator profile not found.
      //
      // =================================================

      const profileRef = doc(db, "enumerators", user.uid);

      // =================================================
      // CREATE ENUMERATOR PROFILE
      // =================================================

      await setDoc(profileRef, {
        // -------------------------------------------
        // AUTH INFORMATION
        // -------------------------------------------

        uid: user.uid,

        email: user.email || email,

        // -------------------------------------------
        // ENUMERATOR INFORMATION
        // -------------------------------------------

        name,

        enumeratorId,

        locality,

        village,

        mobile,

        // -------------------------------------------
        // ACCOUNT STATUS
        // -------------------------------------------

        /*
         * New accounts must be approved
         * by an administrator.
         */

        role: "enumerator",

        status: "pending",

        // -------------------------------------------
        // PROJECT
        // -------------------------------------------

        project: "Census 2027",

        // -------------------------------------------
        // TIMESTAMPS
        // -------------------------------------------

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp(),
      });

      console.log("Enumerator profile created:", user.uid);

      // =================================================
      // SIGN OUT
      // =================================================
      //
      // Because the new account is pending,
      // don't leave the user logged in.
      //
      // =================================================

      await signOut(auth);

      // =================================================
      // SUCCESS
      // =================================================

      setMessage(
        "Registration সফল হয়েছে। আপনার account এখন Administrator-এর approval-এর অপেক্ষায় আছে। Approval হওয়ার পর আপনি Login করে Census 2027 data submit করতে পারবেন।",
      );

      setMessageType("success");

      // Clear password fields
      setForm({
        name: "",
        enumeratorId: "",
        mobile: "",
        email: "",
        password: "",
        confirmPassword: "",
        locality: "",
        village: "",
      });
    } catch (error) {
      console.error("Signup error:", error);

      let errorMessage = "Registration করা যায়নি।";

      // =================================================
      // FIREBASE AUTH ERRORS
      // =================================================

      switch (error.code) {
        case "auth/email-already-in-use":
          errorMessage =
            "এই Email Address দিয়ে ইতিমধ্যে একটি account আছে। Login করুন।";
          break;

        case "auth/invalid-email":
          errorMessage = "Email Address সঠিক নয়।";
          break;

        case "auth/weak-password":
          errorMessage = "Password আরও শক্তিশালী করুন।";
          break;

        case "auth/network-request-failed":
          errorMessage =
            "Network connection সমস্যা হয়েছে। Internet connection পরীক্ষা করুন।";
          break;

        case "auth/operation-not-allowed":
          errorMessage =
            "Firebase Console-এ Email/Password Authentication চালু করা নেই।";
          break;

        case "permission-denied":
        case "firestore/permission-denied":
          errorMessage =
            "Enumerator profile তৈরি করার Firestore permission নেই। আপনার Firestore rules পরীক্ষা করুন।";
          break;

        default:
          if (error.message) {
            errorMessage = error.message;
          }
      }

      setMessage(errorMessage);

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // AUTH CHECK LOADING
  // =====================================================

  if (checkingAuth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-700" />

          <p className="mt-4 text-sm font-semibold text-gray-600">
            Checking account...
          </p>
        </div>
      </main>
    );
  }

  // =====================================================
  // PAGE
  // =====================================================

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 px-4 py-8 sm:px-6">
      <div className="mx-auto w-full max-w-lg">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-5 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-green-700 text-3xl text-white shadow-lg">
            📝
          </div>

          <h1 className="mt-4 text-2xl font-black text-gray-800 sm:text-3xl">
            Census 2027
          </h1>

          <p className="mt-1 text-sm text-gray-500">Enumerator Registration</p>
        </div>

        {/* =================================================
            CARD
        ================================================= */}

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
          {/* CARD HEADER */}

          <div className="bg-gradient-to-r from-green-800 to-green-600 px-5 py-5 text-white sm:px-6">
            <h2 className="text-xl font-bold">Sign Up</h2>

            <p className="mt-1 text-sm text-green-100">
              Census 2027 data collection-এর জন্য account তৈরি করুন।
            </p>
          </div>

          {/* FORM */}

          <form onSubmit={handleSignup} className="space-y-5 p-5 sm:p-6">
            {/* =================================================
                NAME
            ================================================= */}

            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-bold text-gray-700"
              >
                পূর্ণ নাম
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                id="name"
                name="name"
                type="text"
                value={form.name}
                onChange={handleChange}
                placeholder="আপনার পূর্ণ নাম"
                autoComplete="name"
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
              />
            </div>

            {/* =================================================
                ENUMERATOR ID
            ================================================= */}

            <div>
              <label
                htmlFor="enumeratorId"
                className="mb-1.5 block text-sm font-bold text-gray-700"
              >
                Enumerator ID
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                id="enumeratorId"
                name="enumeratorId"
                type="text"
                value={form.enumeratorId}
                onChange={handleChange}
                placeholder="যেমন: EN001"
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm uppercase outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
              />

              <p className="mt-1.5 text-xs text-gray-500">
                আপনাকে দেওয়া Enumerator ID ব্যবহার করুন।
              </p>
            </div>

            {/* =================================================
                LOCATION
            ================================================= */}

            <div>
              <label
                htmlFor="locality"
                className="mb-1.5 block text-sm font-bold text-gray-700"
              >
                Locality
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                id="locality"
                name="locality"
                type="text"
                value={form.locality}
                onChange={handleChange}
                placeholder="Census Locality লিখুন"
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
              />
            </div>

            <div>
              <label
                htmlFor="village"
                className="mb-1.5 block text-sm font-bold text-gray-700"
              >
                Village
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                id="village"
                name="village"
                type="text"
                value={form.village}
                onChange={handleChange}
                placeholder="Census Village লিখুন"
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
              />
            </div>

            {/* =================================================
                MOBILE
            ================================================= */}

            <div>
              <label
                htmlFor="mobile"
                className="mb-1.5 block text-sm font-bold text-gray-700"
              >
                মোবাইল নম্বর
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                id="mobile"
                name="mobile"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={form.mobile}
                onChange={handleChange}
                placeholder="১০ সংখ্যার মোবাইল নম্বর"
                autoComplete="tel"
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
              />
            </div>

            {/* =================================================
                EMAIL
            ================================================= */}

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-bold text-gray-700"
              >
                Email Address
                <span className="ml-1 text-red-500">*</span>
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="example@gmail.com"
                autoComplete="email"
                required
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
              />
            </div>

            {/* =================================================
                PASSWORD
            ================================================= */}

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-bold text-gray-700"
              >
                Password
                <span className="ml-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={handleChange}
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-20 text-sm outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-green-700"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* =================================================
                CONFIRM PASSWORD
            ================================================= */}

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-bold text-gray-700"
              >
                Confirm Password
                <span className="ml-1 text-red-500">*</span>
              </label>

              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Password আবার লিখুন"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 pr-20 text-sm outline-none transition focus:border-green-600 focus:ring-4 focus:ring-green-100"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-green-700"
                >
                  {showConfirmPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* =================================================
                APPROVAL NOTICE
            ================================================= */}

            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <div className="flex gap-3">
                <div className="text-xl">ℹ️</div>

                <div>
                  <p className="text-sm font-bold text-yellow-900">
                    Administrator Approval Required
                  </p>

                  <p className="mt-1 text-xs leading-5 text-yellow-800">
                    Registration করার পর আপনার account
                    <strong> Pending </strong>
                    থাকবে। Administrator approval দেওয়ার পরেই Census 2027 data
                    collection করা যাবে।
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                MESSAGE
            ================================================= */}

            {message && (
              <div
                className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                  messageType === "success"
                    ? "border-green-300 bg-green-50 text-green-800"
                    : "border-red-300 bg-red-50 text-red-800"
                }`}
              >
                <div className="flex gap-2">
                  <span>{messageType === "success" ? "✓" : "⚠"}</span>

                  <p>{message}</p>
                </div>

                {messageType === "success" && (
                  <div className="mt-3">
                    <Link
                      href="/login"
                      className="font-bold text-green-700 underline underline-offset-2 hover:text-green-900"
                    >
                      Login Page-এ যান →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* =================================================
                SUBMIT
            ================================================= */}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-green-700 px-5 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-green-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Registration হচ্ছে...
                </span>
              ) : (
                "✓ Create Enumerator Account"
              )}
            </button>
          </form>

          {/* =================================================
              FOOTER
          ================================================= */}

          <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 text-center sm:px-6">
            <p className="text-sm text-gray-600">ইতিমধ্যে account আছে?</p>

            <Link
              href="/login"
              className="mt-1 inline-block font-bold text-green-700 hover:text-green-900"
            >
              Login করুন →
            </Link>
          </div>
        </div>

        {/* =================================================
            HOME
        ================================================= */}

        <div className="mt-5 text-center">
          <Link
            href="/"
            className="text-sm font-semibold text-gray-500 hover:text-green-700"
          >
            ← Home Page
          </Link>
        </div>

        {/* =================================================
            FOOTER
        ================================================= */}

        <p className="mt-6 text-center text-xs text-gray-400">
          Census 2027 — Household Data Collection
        </p>
      </div>
    </main>
  );
}
