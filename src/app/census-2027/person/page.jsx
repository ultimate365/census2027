"use client";

import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";

import { onAuthStateChanged } from "firebase/auth";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

import { useRouter } from "next/navigation";
import Link from "next/link";

/* ============================================================
   40 INDIVIDUAL CENSUS QUESTIONS
   Based on the supplied Ministry of Home Affairs notification.
   ============================================================ */

const FIELDS = [
  {
    no: 1,
    key: "name",
    label: "Name of the person",
    bn: "ব্যক্তির নাম",
    type: "text",
    required: true,
  },

  {
    no: 2,
    key: "relationshipToHead",
    label: "Relationship to head",
    bn: "গৃহপ্রধানের সঙ্গে সম্পর্ক",
    type: "text",
    required: true,
  },

  {
    no: 3,
    key: "sex",
    label: "Sex",
    bn: "লিঙ্গ",
    type: "text",
    required: true,
  },

  {
    no: 4,
    key: "dateOfBirth",
    label: "Date of Birth and Age (in completed years)",
    bn: "জন্মতারিখ ও বয়স (সম্পূর্ণ বছরে)",
    type: "dob-age",
    required: true,
  },

  {
    no: 5,
    key: "currentMaritalStatus",
    label: "Current Marital Status",
    bn: "বর্তমান বৈবাহিক অবস্থা",
    type: "text",
    required: true,
  },

  {
    no: 6,
    key: "ageAtMarriage",
    label: "Age at Marriage (in completed years)",
    bn: "বিবাহের সময় বয়স (সম্পূর্ণ বছরে)",
    type: "number",
    min: 0,
    max: 120,
  },

  {
    no: 7,
    key: "spouseName",
    label: "Spouse Name",
    bn: "স্বামী/স্ত্রীর নাম",
    type: "text",
  },

  {
    no: 8,
    key: "nationality",
    label: "Nationality as declared",
    bn: "ঘোষিত নাগরিকত্ব",
    type: "text",
  },

  {
    no: 9,
    key: "religion",
    label: "Religion",
    bn: "ধর্ম",
    type: "text",
  },

  {
    no: 10,
    key: "caste",
    label: "Scheduled Caste (SC) / Scheduled Tribe (ST) / Caste",
    bn: "তপশিলি জাতি / তপশিলি উপজাতি / জাতি",
    type: "text",
  },

  {
    no: 11,
    key: "fatherParticulars",
    label: "Father's Particulars",
    bn: "পিতার বিবরণ",
    type: "textarea",
  },

  {
    no: 12,
    key: "motherParticulars",
    label: "Mother's Particulars",
    bn: "মাতার বিবরণ",
    type: "textarea",
  },

  {
    no: 13,
    key: "disability",
    label: "Disability",
    bn: "প্রতিবন্ধিতা",
    type: "text",
  },

  {
    no: 14,
    key: "motherTongueLanguages",
    label: "Mother Tongue and other languages known",
    bn: "মাতৃভাষা এবং জানা অন্যান্য ভাষা",
    type: "textarea",
  },

  {
    no: 15,
    key: "literacyDigitalStatus",
    label: "Literacy and digital literacy status",
    bn: "সাক্ষরতা ও ডিজিটাল সাক্ষরতার অবস্থা",
    type: "text",
  },

  {
    no: 16,
    key: "educationalInstitution",
    label: "Status of attendance in educational institution",
    bn: "শিক্ষাপ্রতিষ্ঠানে উপস্থিতির অবস্থা",
    type: "text",
  },

  {
    no: 17,
    key: "highestEducation",
    label: "Highest educational level attained and Stream/Discipline",
    bn: "সর্বোচ্চ শিক্ষাগত স্তর এবং শাখা/বিষয়",
    type: "textarea",
  },

  {
    no: 18,
    key: "workedLastYear",
    label: "Worked any time during last year",
    bn: "গত বছরে কোনো সময় কাজ করেছেন কি না",
    type: "text",
  },

  {
    no: 19,
    key: "categoryOfEconomicActivity",
    label: "Category of economic activity",
    bn: "অর্থনৈতিক কাজের শ্রেণি",
    type: "text",
  },

  {
    no: 20,
    key: "occupation",
    label: "Occupation",
    bn: "পেশা",
    type: "text",
  },

  {
    no: 21,
    key: "industryTradeService",
    label: "Nature of industry, trade or service",
    bn: "শিল্প, ব্যবসা বা পরিষেবার প্রকৃতি",
    type: "textarea",
  },

  {
    no: 22,
    key: "classOfWorker",
    label: "Class of worker",
    bn: "কর্মীর শ্রেণি",
    type: "text",
  },

  {
    no: 23,
    key: "nonEconomicActivity",
    label: "Non-economic activity (for marginal, semi-marginal and non-worker)",
    bn: "অর্থনৈতিক-বহির্ভূত কাজ (প্রান্তিক, অর্ধ-প্রান্তিক ও অ-কর্মীর জন্য)",
    type: "textarea",
  },

  {
    no: 24,
    key: "seekingWork",
    label:
      "Seeking or available for work (for marginal, semi-marginal and non-worker)",
    bn: "কাজ খুঁজছেন বা কাজের জন্য উপলব্ধ (প্রান্তিক, অর্ধ-প্রান্তিক ও অ-কর্মীর জন্য)",
    type: "text",
  },

  {
    no: 25,
    key: "placeOfWork",
    label: "Place of work",
    bn: "কর্মস্থল",
    type: "textarea",
  },

  {
    no: 26,
    key: "birthPlace",
    label: "Birth place",
    bn: "জন্মস্থান",
    type: "textarea",
  },

  {
    no: 27,
    key: "placeOfLastResidence",
    label: "Place of last residence",
    bn: "শেষ বসবাসের স্থান",
    type: "textarea",
  },

  {
    no: 28,
    key: "reasonForMigration",
    label: "Reason for migration",
    bn: "অভিবাসনের কারণ",
    type: "textarea",
  },

  {
    no: 29,
    key: "durationOfStay",
    label: "Duration of stay in this village/town since last migration",
    bn: "শেষ অভিবাসনের পর এই গ্রাম/শহরে বসবাসের সময়কাল",
    type: "text",
  },

  {
    no: 30,
    key: "permanentResidentialAddress",
    label: "Permanent Residential Address",
    bn: "স্থায়ী আবাসিক ঠিকানা",
    type: "textarea",
  },

  {
    no: 31,
    key: "childrenCurrentlyPresent",
    label:
      "Number of children surviving at present (for currently married, widowed, divorced and separated women only)",
    bn: "বর্তমানে জীবিত সন্তানের সংখ্যা (শুধুমাত্র বর্তমানে বিবাহিত, বিধবা, বিবাহবিচ্ছিন্ন ও বিচ্ছিন্ন মহিলাদের জন্য)",
    type: "number",
    min: 0,
  },

  {
    no: 32,
    key: "childrenEverBorn",
    label:
      "Number of children ever born alive (for currently married, widowed, divorced and separated women)",
    bn: "জীবিত জন্ম দেওয়া মোট সন্তানের সংখ্যা (বর্তমানে বিবাহিত, বিধবা, বিবাহবিচ্ছিন্ন ও বিচ্ছিন্ন মহিলাদের জন্য)",
    type: "number",
    min: 0,
  },

  {
    no: 33,
    key: "childrenBornLastYear",
    label:
      "Number of children born alive during last one year (for currently married women only)",
    bn: "গত এক বছরে জীবিত জন্ম নেওয়া সন্তানের সংখ্যা (শুধুমাত্র বর্তমানে বিবাহিত মহিলাদের জন্য)",
    type: "number",
    min: 0,
  },

  {
    no: 34,
    key: "placeOfCovidVaccination",
    label: "Place of Covid-19 Vaccination",
    bn: "কোভিড-১৯ টিকাকরণের স্থান",
    type: "text",
  },

  {
    no: 35,
    key: "totalBankAccounts",
    label: "Total number of Bank Accounts",
    bn: "মোট ব্যাংক অ্যাকাউন্টের সংখ্যা",
    type: "number",
    min: 0,
  },

  {
    no: 36,
    key: "mobileNumber",
    label: "Mobile Number (if available)",
    bn: "মোবাইল নম্বর (যদি থাকে)",
    type: "tel",
  },

  {
    no: 37,
    key: "aadhaarNumber",
    label: "Aadhaar Number (if available)",
    bn: "আধার নম্বর (যদি থাকে)",
    type: "text",
  },

  {
    no: 38,
    key: "voterId",
    label: "Voter ID Number (if available)",
    bn: "ভোটার আইডি নম্বর (যদি থাকে)",
    type: "text",
  },

  {
    no: 39,
    key: "passportNumber",
    label: "Passport Number (if Indian Passport holder)",
    bn: "পাসপোর্ট নম্বর (যদি ভারতীয় পাসপোর্টধারী হন)",
    type: "text",
  },

  {
    no: 40,
    key: "drivingLicence",
    label: "Availability of Driving License",
    bn: "ড্রাইভিং লাইসেন্সের প্রাপ্যতা",
    type: "text",
  },
];

/* ============================================================
   INITIAL FORM
   ============================================================ */

const INITIAL_FORM = Object.fromEntries(FIELDS.map((field) => [field.key, ""]));

/* ============================================================
   MAIN PAGE
   ============================================================ */

export default function CensusPersonPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);

  const [userProfile, setUserProfile] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);

  const [form, setForm] = useState(INITIAL_FORM);

  const [householdInfo, setHouseholdInfo] = useState({
    buildingNo: "",
    censusNo: "",
    householdId: "",
  });

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  const [error, setError] = useState("");

  /* ==========================================================
     AUTH
     ========================================================== */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (!currentUser) {
          setUser(null);
          setUserProfile(null);
          setAuthLoading(false);

          router.replace("/login");

          return;
        }

        setUser(currentUser);

        /*
         * Enumerator profile
         *
         * Expected:
         * enumerators/{uid}
         */

        try {
          const profileRef = doc(db, "enumerators", currentUser.uid);

          const profileSnap = await getDoc(profileRef);

          if (profileSnap.exists()) {
            setUserProfile(profileSnap.data());
          } else {
            /*
             * Do not block the page.
             *
             * The authenticated Firebase user
             * can still be used.
             */
            setUserProfile({
              uid: currentUser.uid,

              email: currentUser.email || "",
            });
          }
        } catch (profileError) {
          console.error("Enumerator profile error:", profileError);

          setUserProfile({
            uid: currentUser.uid,

            email: currentUser.email || "",
          });
        }

        setAuthLoading(false);
      } catch (err) {
        console.error(err);

        setAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  /* ==========================================================
     FORM HANDLER
     ========================================================== */

  function handleChange(key, value) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  /* ==========================================================
     HOUSEHOLD HANDLER
     ========================================================== */

  function handleHouseholdChange(key, value) {
    setHouseholdInfo((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  /* ==========================================================
     AGE FROM DOB
     ========================================================== */

  const calculatedAge = useMemo(() => {
    if (!form.dateOfBirth) {
      return "";
    }

    const dob = new Date(form.dateOfBirth);

    if (Number.isNaN(dob.getTime())) {
      return "";
    }

    const today = new Date();

    let age = today.getFullYear() - dob.getFullYear();

    const monthDifference = today.getMonth() - dob.getMonth();

    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < dob.getDate())
    ) {
      age--;
    }

    return age >= 0 ? age : "";
  }, [form.dateOfBirth]);

  /* ==========================================================
     REQUIRED VALIDATION
     ========================================================== */

  function validate() {
    const requiredFields = FIELDS.filter((field) => field.required);

    for (const field of requiredFields) {
      if (!String(form[field.key] || "").trim()) {
        return `${field.no}. ${field.bn} পূরণ করুন।`;
      }
    }

    if (form.mobileNumber && !/^[0-9+\-\s]{7,20}$/.test(form.mobileNumber)) {
      return "সঠিক মোবাইল নম্বর দিন।";
    }

    return "";
  }

  /* ==========================================================
     SUBMIT
     ========================================================== */

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!user) {
      setError("আপনি লগইন করেননি।");

      return;
    }

    const validation = validate();

    if (validation) {
      setError(validation);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });

      return;
    }

    try {
      setSaving(true);

      /*
       * Prepare the data.
       */

      const personData = {
        ...form,

        /*
         * Household reference
         */

        buildingNo: householdInfo.buildingNo || "",

        censusNo: householdInfo.censusNo || "",

        householdId: householdInfo.householdId || "",

        /*
         * Enumerator information
         */

        enumeratorUid: user.uid,

        enumeratorEmail: user.email || "",

        enumeratorName:
          userProfile?.name ||
          userProfile?.enumeratorName ||
          user.displayName ||
          "",

        /*
         * Metadata
         */

        phase: "individual",

        censusYear: 2027,

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp(),
      };

      /*
       * Collection:
       *
       * census2027_persons
       */

      const ref = await addDoc(
        collection(db, "census2027_persons"),
        personData,
      );

      console.log("Person record created:", ref.id);

      setMessage("ব্যক্তির Census 2027 তথ্য সফলভাবে জমা হয়েছে।");

      /*
       * Clear form after successful submission.
       */

      setForm(INITIAL_FORM);

      setHouseholdInfo({
        buildingNo: "",
        censusNo: "",
        householdId: "",
      });

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error("Census person submission error:", err);

      if (err?.code === "permission-denied") {
        setError(
          "Firestore permission denied। Firebase Security Rules পরীক্ষা করুন।",
        );
      } else {
        setError(err?.message || "তথ্য জমা দেওয়া যায়নি।");
      }
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
     RESET
     ========================================================== */

  function handleReset() {
    if (!window.confirm("আপনি কি সমস্ত তথ্য মুছে ফেলতে চান?")) {
      return;
    }

    setForm(INITIAL_FORM);

    setHouseholdInfo({
      buildingNo: "",
      censusNo: "",
      householdId: "",
    });

    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  /* ==========================================================
     LOADING
     ========================================================== */

  if (authLoading) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow p-8 text-center">
          <div className="text-3xl mb-3">⏳</div>

          <p className="text-lg font-semibold text-slate-700">Loading...</p>
        </div>
      </main>
    );
  }

  /* ==========================================================
     RENDER FIELD
     ========================================================== */

  function renderField(field) {
    const value = form[field.key] ?? "";

    const commonClass =
      "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[16px] text-slate-800 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100";

    if (field.type === "textarea") {
      return (
        <textarea
          value={value}
          onChange={(e) => handleChange(field.key, e.target.value)}
          rows={3}
          className={`${commonClass} resize-y`}
          placeholder={`${field.bn} লিখুন`}
        />
      );
    }

    if (field.type === "dob-age") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              জন্মতারিখ
            </label>

            <input
              type="date"
              value={value}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className={commonClass}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">
              সম্পূর্ণ বছর
            </label>

            <input
              type="number"
              value={calculatedAge}
              readOnly
              className={`${commonClass} bg-slate-100`}
            />
          </div>
        </div>
      );
    }

    return (
      <input
        type={field.type === "number" ? "number" : field.type}
        value={value}
        min={field.min}
        max={field.max}
        inputMode={
          field.type === "tel"
            ? "tel"
            : field.type === "number"
              ? "numeric"
              : undefined
        }
        onChange={(e) => handleChange(field.key, e.target.value)}
        className={commonClass}
        placeholder={`${field.bn} লিখুন`}
      />
    );
  }

  /* ==========================================================
     PAGE
     ========================================================== */

  return (
    <main className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* =====================================================
            PAGE HEADER
            ===================================================== */}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="bg-green-700 text-white px-5 py-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  ভারতের জনগণনা ২০২৭
                </h1>

                <p className="mt-1 text-green-50">
                  Individual / Person Data Collection
                </p>
              </div>

              <div className="text-left md:text-right">
                <div className="inline-block bg-white/15 rounded-lg px-4 py-2">
                  <div className="text-xs text-green-100">Phase</div>

                  <div className="font-bold">ব্যক্তিগত তথ্য সংগ্রহ</div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 bg-green-50 border-b border-green-100">
            <p className="text-sm sm:text-base text-slate-700">
              গৃহতালিকা ও গৃহগণনার পরবর্তী পর্যায়ে প্রত্যেক ব্যক্তির
              প্রয়োজনীয় তথ্য সংগ্রহ ও সংরক্ষণ করুন।
            </p>
          </div>
        </div>

        {/* =====================================================
            USER INFORMATION
            ===================================================== */}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-xs text-slate-500">Enumerator</p>

              <p className="font-bold text-slate-800">
                {userProfile?.name ||
                  userProfile?.enumeratorName ||
                  user?.displayName ||
                  user?.email ||
                  "Enumerator"}
              </p>
            </div>
            <div className="mt-3 flex gap-2">
              <Link
                href="/census-2027/person/data"
                className="inline-block rounded-lg bg-white px-4 py-2 text-sm font-bold text-green-800 shadow transition hover:bg-green-50"
              >
                Go to Collection Data
              </Link>
            </div>
            <div>
              <p className="text-xs text-slate-500">Account</p>

              <p className="text-sm text-slate-700">{user?.email || ""}</p>
            </div>
          </div>
        </div>

        {/* =====================================================
            SUCCESS
            ===================================================== */}

        {message && (
          <div className="mb-6 rounded-2xl border border-green-300 bg-green-50 px-5 py-4 text-green-800">
            <div className="font-bold mb-1">✓ সফল</div>

            <div>{message}</div>
          </div>
        )}

        {/* =====================================================
            ERROR
            ===================================================== */}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-300 bg-red-50 px-5 py-4 text-red-800">
            <div className="font-bold mb-1">তথ্য জমা দেওয়া যায়নি</div>

            <div>{error}</div>
          </div>
        )}

        {/* =====================================================
            FORM
            ===================================================== */}

        <form onSubmit={handleSubmit}>
          {/* ===================================================
              HOUSEHOLD LINK
              =================================================== */}

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-blue-50 border-b border-blue-100 px-5 py-4">
              <h2 className="text-xl font-bold text-slate-800">
                গৃহের সঙ্গে সংযোগ
              </h2>

              <p className="text-sm text-slate-600 mt-1">
                এই ব্যক্তির তথ্য কোন Census House / Household-এর অন্তর্গত তা
                উল্লেখ করুন।
              </p>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
              <div>
                <label className="block font-semibold text-slate-700 mb-2">
                  Building No.
                </label>

                <input
                  type="text"
                  value={householdInfo.buildingNo}
                  onChange={(e) =>
                    handleHouseholdChange("buildingNo", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  placeholder="Building No."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">
                  Census House No.
                </label>

                <input
                  type="text"
                  value={householdInfo.censusNo}
                  onChange={(e) =>
                    handleHouseholdChange("censusNo", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  placeholder="Census House No."
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-2">
                  Household ID
                </label>

                <input
                  type="text"
                  value={householdInfo.householdId}
                  onChange={(e) =>
                    handleHouseholdChange("householdId", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                  placeholder="Household ID / Document ID"
                />
              </div>
            </div>
          </section>

          {/* ===================================================
              PERSONAL DETAILS
              =================================================== */}

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-green-50 border-b border-green-100 px-5 py-4">
              <h2 className="text-xl font-bold text-slate-800">
                ব্যক্তিগত তথ্য
              </h2>

              <p className="text-sm text-slate-600">প্রশ্ন ১–১০</p>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {FIELDS.filter((field) => field.no >= 1 && field.no <= 10).map(
                (field) => (
                  <div
                    key={field.key}
                    className={
                      field.type === "textarea" || field.type === "dob-age"
                        ? "md:col-span-2"
                        : ""
                    }
                  >
                    <FieldLabel field={field} />

                    {renderField(field)}
                  </div>
                ),
              )}
            </div>
          </section>

          {/* ===================================================
              FAMILY / PARENTAL DETAILS
              =================================================== */}

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-green-50 border-b border-green-100 px-5 py-4">
              <h2 className="text-xl font-bold text-slate-800">
                পারিবারিক ও শিক্ষাগত তথ্য
              </h2>

              <p className="text-sm text-slate-600">প্রশ্ন ১১–১৭</p>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {FIELDS.filter((field) => field.no >= 11 && field.no <= 17).map(
                (field) => (
                  <div
                    key={field.key}
                    className={field.type === "textarea" ? "md:col-span-2" : ""}
                  >
                    <FieldLabel field={field} />

                    {renderField(field)}
                  </div>
                ),
              )}
            </div>
          </section>

          {/* ===================================================
              WORK / ECONOMIC DETAILS
              =================================================== */}

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-green-50 border-b border-green-100 px-5 py-4">
              <h2 className="text-xl font-bold text-slate-800">
                কর্মসংস্থান ও অর্থনৈতিক তথ্য
              </h2>

              <p className="text-sm text-slate-600">প্রশ্ন ১৮–২৫</p>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {FIELDS.filter((field) => field.no >= 18 && field.no <= 25).map(
                (field) => (
                  <div
                    key={field.key}
                    className={field.type === "textarea" ? "md:col-span-2" : ""}
                  >
                    <FieldLabel field={field} />

                    {renderField(field)}
                  </div>
                ),
              )}
            </div>
          </section>

          {/* ===================================================
              MIGRATION / RESIDENCE
              =================================================== */}

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-green-50 border-b border-green-100 px-5 py-4">
              <h2 className="text-xl font-bold text-slate-800">
                জন্মস্থান, অভিবাসন ও বাসস্থান
              </h2>

              <p className="text-sm text-slate-600">প্রশ্ন ২৬–৩০</p>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {FIELDS.filter((field) => field.no >= 26 && field.no <= 30).map(
                (field) => (
                  <div key={field.key} className="md:col-span-1">
                    <FieldLabel field={field} />

                    {renderField(field)}
                  </div>
                ),
              )}
            </div>
          </section>

          {/* ===================================================
              WOMEN / CHILDREN / OTHER DETAILS
              =================================================== */}

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-green-50 border-b border-green-100 px-5 py-4">
              <h2 className="text-xl font-bold text-slate-800">
                সন্তান, টিকাকরণ ও ব্যাংক তথ্য
              </h2>

              <p className="text-sm text-slate-600">প্রশ্ন ৩১–৩৫</p>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {FIELDS.filter((field) => field.no >= 31 && field.no <= 35).map(
                (field) => (
                  <div key={field.key}>
                    <FieldLabel field={field} />

                    {renderField(field)}
                  </div>
                ),
              )}
            </div>
          </section>

          {/* ===================================================
              IDENTITY DOCUMENTS
              =================================================== */}

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-amber-50 border-b border-amber-100 px-5 py-4">
              <h2 className="text-xl font-bold text-slate-800">
                যোগাযোগ ও পরিচয়পত্র
              </h2>

              <p className="text-sm text-slate-600">প্রশ্ন ৩৬–৪০</p>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {FIELDS.filter((field) => field.no >= 36 && field.no <= 40).map(
                (field) => (
                  <div key={field.key}>
                    <FieldLabel field={field} />

                    {renderField(field)}
                  </div>
                ),
              )}
            </div>
          </section>

          {/* ===================================================
              SUBMIT
              =================================================== */}

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-8">
            <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4 mb-5">
              <p className="font-bold text-yellow-900 mb-1">
                জমা দেওয়ার আগে যাচাই করুন
              </p>

              <p className="text-sm text-yellow-800">
                নাম, সম্পর্ক, জন্মতারিখ, শিক্ষাগত যোগ্যতা, পেশা এবং অন্যান্য
                ব্যক্তিগত তথ্য সঠিকভাবে যাচাই করে Submit করুন।
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="w-full sm:w-auto rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                ফর্ম পরিষ্কার করুন
              </button>

              <button
                type="submit"
                disabled={saving}
                className="w-full sm:flex-1 rounded-xl bg-green-700 px-6 py-4 text-lg font-bold text-white shadow-md hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "তথ্য জমা হচ্ছে..." : "✓ Census 2027 তথ্য জমা দিন"}
              </button>
            </div>
          </section>
        </form>

        {/* =====================================================
            FOOTER
            ===================================================== */}

        <div className="text-center text-sm text-slate-500 pb-8">
          <p>Census 2027 — Individual / Person Data Collection</p>

          <p className="mt-1">
            All collected information should be verified before submission.
          </p>
        </div>
      </div>
    </main>
  );
}

/* ============================================================
   FIELD LABEL
   ============================================================ */

function FieldLabel({ field }) {
  return (
    <label className="block mb-2">
      <div className="flex items-start gap-2">
        <span className="flex-shrink-0 inline-flex items-center justify-center min-w-7 h-7 rounded-lg bg-slate-800 px-2 text-xs font-bold text-white">
          {field.no}
        </span>

        <div>
          <div className="font-semibold text-slate-800 leading-snug">
            {field.bn}

            {field.required && <span className="text-red-600 ml-1">*</span>}
          </div>

          <div className="text-xs text-slate-500 mt-0.5 leading-snug">
            {field.label}
          </div>
        </div>
      </div>
    </label>
  );
}
