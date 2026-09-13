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

/* ============================================================
   COMMON SELECT OPTIONS
   ============================================================ */

const OPTIONS = {
  relationshipToHead: [
    "Head",
    "Wife/Husband",
    "Son",
    "Daughter",
    "Father",
    "Mother",
    "Brother",
    "Sister",
    "Grandson",
    "Granddaughter",
    "Father-in-law",
    "Mother-in-law",
    "Son-in-law",
    "Daughter-in-law",
    "Other Relative",
    "Non Relative",
  ],

  sex: ["Male", "Female", "Transgender"],

  currentMaritalStatus: [
    "Never Married",
    "Currently Married",
    "Widowed",
    "Divorced",
    "Separated",
  ],

  nationality: ["Indian", "Other Country"],

  religion: [
    "Hindu",
    "Muslim",
    "Christian",
    "Sikh",
    "Buddhist",
    "Jain",
    "Parsi",
    "Other",
    "No Religion",
  ],

  caste: [
    "General",
    "Scheduled Caste",
    "Scheduled Tribe",
    "Other Backward Class",
    "Other",
  ],

  disability: [
    "No Disability",
    "Seeing",
    "Hearing",
    "Speech",
    "Movement",
    "Mental Illness",
    "Intellectual Disability",
    "Multiple Disability",
    "Other Disability",
  ],

  literacyDigitalStatus: [
    "Illiterate",
    "Literate",
    "Literate with Digital Literacy",
  ],

  educationalInstitution: [
    "Never Attended",
    "Currently Attending",
    "Attended Before",
    "Dropped Out",
  ],

  highestEducation: [
    "No Education",
    "Below Primary",
    "Primary",
    "Middle",
    "Secondary",
    "Higher Secondary",
    "Diploma",
    "Graduate",
    "Post Graduate",
    "Professional Degree",
    "Doctorate",
  ],

  workedLastYear: ["Yes", "No"],

  categoryOfEconomicActivity: ["Main Worker", "Marginal Worker", "Non Worker"],

  classOfWorker: [
    "Government Employee",
    "Private Employee",
    "Self Employed",
    "Employer",
    "Casual Labour",
    "Unpaid Family Worker",
    "Other",
  ],

  seekingWork: ["Yes", "No"],

  reasonForMigration: [
    "Work/Employment",
    "Business",
    "Education",
    "Marriage",
    "Moved with Household",
    "Birth",
    "Natural Disaster",
    "Other",
  ],

  placeOfCovidVaccination: [
    "Government Hospital",
    "Private Hospital",
    "Health Centre",
    "Camp",
    "Not Vaccinated",
  ],

  drivingLicence: ["Yes", "No"],

  childrenCurrentlyPresent: Array.from({ length: 16 }, (_, i) => String(i)),

  childrenEverBorn: Array.from({ length: 16 }, (_, i) => String(i)),

  childrenBornLastYear: Array.from({ length: 6 }, (_, i) => String(i)),

  totalBankAccounts: Array.from({ length: 11 }, (_, i) => String(i)),
};

/* ============================================================
   FIELD DEFINITIONS
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
    type: "select",
    required: true,
  },

  {
    no: 3,
    key: "sex",
    label: "Sex",
    bn: "লিঙ্গ",
    type: "select",
    required: true,
  },

  {
    no: 4,
    key: "dateOfBirth",
    label: "Date of Birth",
    bn: "জন্মতারিখ",
    type: "date",
    required: true,
  },

  {
    no: 5,
    key: "currentMaritalStatus",
    label: "Current Marital Status",
    bn: "বর্তমান বৈবাহিক অবস্থা",
    type: "select",
    required: true,
  },

  {
    no: 6,
    key: "ageAtMarriage",
    label: "Age at Marriage",
    bn: "বিবাহের সময় বয়স",
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
    type: "select",
  },

  {
    no: 9,
    key: "religion",
    label: "Religion",
    bn: "ধর্ম",
    type: "select",
  },

  {
    no: 10,
    key: "caste",
    label: "Scheduled Caste / Scheduled Tribe / Caste",
    bn: "তপশিলি জাতি / তপশিলি উপজাতি / জাতি",
    type: "select",
  },

  {
    no: 11,
    key: "fatherParticulars",
    label: "Father's Particulars",
    bn: "পিতার বিবরণ",
    type: "text",
    // type: "textarea",
  },

  {
    no: 12,
    key: "motherParticulars",
    label: "Mother's Particulars",
    bn: "মাতার বিবরণ",
    type: "text",
    // type: "textarea",
  },

  {
    no: 13,
    key: "disability",
    label: "Disability",
    bn: "প্রতিবন্ধিতা",
    type: "select",
  },

  {
    no: 14,
    key: "motherTongueLanguages",
    label: "Mother Tongue and other languages known",
    bn: "মাতৃভাষা এবং জানা অন্যান্য ভাষা",
    type: "text",
    // type: "textarea",
  },

  {
    no: 15,
    key: "literacyDigitalStatus",
    label: "Literacy and digital literacy status",
    bn: "সাক্ষরতা ও ডিজিটাল সাক্ষরতার অবস্থা",
    type: "select",
  },

  {
    no: 16,
    key: "educationalInstitution",
    label: "Status of attendance in educational institution",
    bn: "শিক্ষাপ্রতিষ্ঠানে উপস্থিতির অবস্থা",
    type: "select",
  },

  {
    no: 17,
    key: "highestEducation",
    label: "Highest educational level attained and Stream/Discipline",
    bn: "সর্বোচ্চ শিক্ষাগত স্তর এবং শাখা/বিষয়",
    type: "select",
  },

  {
    no: 18,
    key: "workedLastYear",
    label: "Worked any time during last year",
    bn: "গত বছরে কোনো সময় কাজ করেছেন কি না",
    type: "select",
  },

  {
    no: 19,
    key: "categoryOfEconomicActivity",
    label: "Category of economic activity",
    bn: "অর্থনৈতিক কাজের শ্রেণি",
    type: "select",
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
    type: "text",
    // type: "textarea",
  },

  {
    no: 22,
    key: "classOfWorker",
    label: "Class of worker",
    bn: "কর্মীর শ্রেণি",
    type: "select",
  },

  {
    no: 23,
    key: "nonEconomicActivity",
    label: "Non-economic activity",
    bn: "অর্থনৈতিক-বহির্ভূত কাজ",
    type: "text",
    // type: "textarea",
  },

  {
    no: 24,
    key: "seekingWork",
    label: "Seeking or available for work",
    bn: "কাজ খুঁজছেন বা কাজের জন্য উপলব্ধ",
    type: "select",
  },

  {
    no: 25,
    key: "placeOfWork",
    label: "Place of work",
    bn: "কর্মস্থল",
    type: "text",
    // type: "textarea",
  },

  {
    no: 26,
    key: "birthPlace",
    label: "Birth place",
    bn: "জন্মস্থান",
    type: "text",
    // type: "textarea",
  },

  {
    no: 27,
    key: "placeOfLastResidence",
    label: "Place of last residence",
    bn: "শেষ বসবাসের স্থান",
    type: "text",
    // type: "textarea",
  },

  {
    no: 28,
    key: "reasonForMigration",
    label: "Reason for migration",
    bn: "অভিবাসনের কারণ",
    type: "select",
  },

  {
    no: 29,
    key: "durationOfStay",
    label: "Duration of stay since last migration",
    bn: "শেষ অভিবাসনের পর বসবাসের সময়কাল",
    type: "text",
  },

  {
    no: 30,
    key: "permanentResidentialAddress",
    label: "Permanent Residential Address",
    bn: "স্থায়ী আবাসিক ঠিকানা",
    type: "text",
    // type: "textarea",
  },

  {
    no: 31,
    key: "childrenCurrentlyPresent",
    label: "Number of children surviving at present",
    bn: "বর্তমানে জীবিত সন্তানের সংখ্যা",
    type: "select",
  },

  {
    no: 32,
    key: "childrenEverBorn",
    label: "Number of children ever born alive",
    bn: "জীবিত জন্ম দেওয়া মোট সন্তানের সংখ্যা",
    type: "select",
  },

  {
    no: 33,
    key: "childrenBornLastYear",
    label: "Children born alive during last one year",
    bn: "গত এক বছরে জীবিত জন্ম নেওয়া সন্তানের সংখ্যা",
    type: "select",
  },

  {
    no: 34,
    key: "placeOfCovidVaccination",
    label: "Place of Covid-19 Vaccination",
    bn: "কোভিড-১৯ টিকাকরণের স্থান",
    type: "select",
  },

  {
    no: 35,
    key: "totalBankAccounts",
    label: "Total number of Bank Accounts",
    bn: "মোট ব্যাংক অ্যাকাউন্টের সংখ্যা",
    type: "select",
  },

  {
    no: 36,
    key: "mobileNumber",
    label: "Mobile Number",
    bn: "মোবাইল নম্বর",
    type: "tel",
  },

  {
    no: 37,
    key: "aadhaarNumber",
    label: "Aadhaar Number",
    bn: "আধার নম্বর",
    type: "number",
  },

  {
    no: 38,
    key: "voterId",
    label: "Voter ID Number",
    bn: "ভোটার আইডি নম্বর",
    type: "text",
  },

  {
    no: 39,
    key: "passportNumber",
    label: "Passport Number",
    bn: "পাসপোর্ট নম্বর",
    type: "text",
  },

  {
    no: 40,
    key: "drivingLicence",
    label: "Availability of Driving License",
    bn: "ড্রাইভিং লাইসেন্সের প্রাপ্যতা",
    type: "select",
  },
];

/* ============================================================
   INITIAL FORM
   ============================================================ */

const INITIAL_FORM = {};

FIELDS.forEach((field) => {
  INITIAL_FORM[field.key] = "";
});

/* ============================================================
   PAGE
   ============================================================ */

export default function CensusPersonPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);

  const [userProfile, setUserProfile] = useState(null);

  const [authLoading, setAuthLoading] = useState(true);

  const [form, setForm] = useState({
    ...INITIAL_FORM,
  });

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
      if (!currentUser) {
        setUser(null);
        setUserProfile(null);
        setAuthLoading(false);

        router.replace("/login");

        return;
      }

      setUser(currentUser);

      try {
        const profileRef = doc(db, "enumerators", currentUser.uid);

        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          setUserProfile(profileSnap.data());
        } else {
          setUserProfile({
            uid: currentUser.uid,

            email: currentUser.email || "",
          });
        }
      } catch (profileError) {
        console.error("Profile error:", profileError);

        setUserProfile({
          uid: currentUser.uid,

          email: currentUser.email || "",
        });
      }

      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  /* ==========================================================
     CHANGE
     ========================================================== */

  function handleChange(key, value) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  function handleHouseholdChange(key, value) {
    setHouseholdInfo((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  /* ==========================================================
     AGE
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

    const month = today.getMonth() - dob.getMonth();

    if (month < 0 || (month === 0 && today.getDate() < dob.getDate())) {
      age--;
    }

    return age >= 0 ? age : "";
  }, [form.dateOfBirth]);

  /* ==========================================================
     VALIDATE
     ========================================================== */

  function validate() {
    const required = FIELDS.filter((field) => field.required);

    for (const field of required) {
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

      const personData = {
        ...form,

        buildingNo: householdInfo.buildingNo || "",

        censusNo: householdInfo.censusNo || "",

        householdId: householdInfo.householdId || "",

        enumeratorUid: user.uid,

        enumeratorEmail: user.email || "",

        enumeratorName:
          userProfile?.name ||
          userProfile?.enumeratorName ||
          user.displayName ||
          "",

        phase: "individual",

        censusYear: 2027,

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "census2027_persons"), personData);

      setMessage("ব্যক্তির Census 2027 তথ্য সফলভাবে জমা হয়েছে।");

      setForm({
        ...INITIAL_FORM,
      });

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
      console.error("Submit error:", err);

      setError(err?.message || "তথ্য জমা দেওয়া যায়নি।");
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

    setForm({
      ...INITIAL_FORM,
    });

    setHouseholdInfo({
      buildingNo: "",
      censusNo: "",
      householdId: "",
    });

    setError("");
    setMessage("");
  }

  /* ==========================================================
     FIELD RENDER
     ========================================================== */

  function renderField(field) {
    const value = form[field.key] ?? "";

    const commonClass =
      "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-[16px] text-slate-800 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100";

    /* SELECT */

    if (field.type === "select") {
      return (
        <select
          value={value}
          onChange={(e) => handleChange(field.key, e.target.value)}
          className={commonClass}
        >
          <option value="">-- নির্বাচন করুন --</option>

          {(OPTIONS[field.key] || []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    /* TEXTAREA */

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

    /* DATE */

    if (field.type === "date") {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="date"
            value={value}
            onChange={(e) => handleChange(field.key, e.target.value)}
            className={commonClass}
          />

          <div>
            <div className="text-xs font-semibold text-slate-500 mb-1">
              সম্পূর্ণ বয়স
            </div>

            <input
              type="number"
              readOnly
              value={calculatedAge}
              className={`${commonClass} bg-slate-100`}
            />
          </div>
        </div>
      );
    }

    return (
      <input
        type={field.type}
        value={value}
        min={field.min}
        max={field.max}
        onChange={(e) => handleChange(field.key, e.target.value)}
        className={commonClass}
        placeholder={`${field.bn} লিখুন`}
      />
    );
  }

  /* ==========================================================
     LOADING
     ========================================================== */

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="bg-white rounded-2xl shadow p-8">Loading...</div>
      </main>
    );
  }

  /* ==========================================================
     RENDER
     ========================================================== */

  return (
    <main className="min-h-screen bg-slate-100 py-6 px-3 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="bg-green-700 text-white px-5 py-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  ভারতের জনগণনা ২০২৭
                </h1>

                <p className="mt-1 text-green-100">
                  Individual / Person Data Collection
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/census-2027/person/data")}
                className="rounded-xl bg-white px-4 py-2 font-bold text-green-700"
              >
                তথ্য দেখুন / পরিচালনা করুন
              </button>
            </div>
          </div>
        </div>

        {/* SUCCESS */}

        {message && (
          <div className="mb-6 rounded-xl border border-green-300 bg-green-50 px-5 py-4 text-green-800">
            <b>✓ সফল:</b> {message}
          </div>
        )}

        {/* ERROR */}

        {error && (
          <div className="mb-6 rounded-xl border border-red-300 bg-red-50 px-5 py-4 text-red-800">
            <b>ত্রুটি:</b> {error}
          </div>
        )}

        {/* FORM */}

        <form onSubmit={handleSubmit}>
          {/* HOUSEHOLD */}

          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            <div className="bg-blue-50 px-5 py-4 border-b border-blue-100">
              <h2 className="text-xl font-bold">গৃহের সঙ্গে সংযোগ</h2>

              <p className="text-sm text-slate-600">
                ব্যক্তির তথ্য সংশ্লিষ্ট Census House-এর সঙ্গে যুক্ত করুন।
              </p>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-5">
              <HouseholdInput
                label="Building No."
                value={householdInfo.buildingNo}
                onChange={(value) => handleHouseholdChange("buildingNo", value)}
              />

              <HouseholdInput
                label="Census House No."
                value={householdInfo.censusNo}
                onChange={(value) => handleHouseholdChange("censusNo", value)}
              />

              <HouseholdInput
                label="Household ID"
                value={householdInfo.householdId}
                onChange={(value) =>
                  handleHouseholdChange("householdId", value)
                }
              />
            </div>
          </section>

          {/* PERSONAL */}

          <FormSection
            title="ব্যক্তিগত তথ্য"
            subtitle="প্রশ্ন ১–১০"
            fields={FIELDS.filter((field) => field.no >= 1 && field.no <= 10)}
            renderField={renderField}
          />

          {/* FAMILY */}

          <FormSection
            title="পারিবারিক ও শিক্ষাগত তথ্য"
            subtitle="প্রশ্ন ১১–১৭"
            fields={FIELDS.filter((field) => field.no >= 11 && field.no <= 17)}
            renderField={renderField}
          />

          {/* WORK */}

          <FormSection
            title="কর্মসংস্থান ও অর্থনৈতিক তথ্য"
            subtitle="প্রশ্ন ১৮–২৫"
            fields={FIELDS.filter((field) => field.no >= 18 && field.no <= 25)}
            renderField={renderField}
          />

          {/* MIGRATION */}

          <FormSection
            title="জন্মস্থান, অভিবাসন ও বাসস্থান"
            subtitle="প্রশ্ন ২৬–৩০"
            fields={FIELDS.filter((field) => field.no >= 26 && field.no <= 30)}
            renderField={renderField}
          />

          {/* CHILDREN */}

          <FormSection
            title="সন্তান, টিকাকরণ ও ব্যাংক তথ্য"
            subtitle="প্রশ্ন ৩১–৩৫"
            fields={FIELDS.filter((field) => field.no >= 31 && field.no <= 35)}
            renderField={renderField}
          />

          {/* ID */}

          <FormSection
            title="যোগাযোগ ও পরিচয়পত্র"
            subtitle="প্রশ্ন ৩৬–৪০"
            fields={FIELDS.filter((field) => field.no >= 36 && field.no <= 40)}
            renderField={renderField}
          />

          {/* BUTTONS */}

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-8">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-5">
              <p className="font-bold text-yellow-900">
                জমা দেওয়ার আগে যাচাই করুন
              </p>

              <p className="text-sm text-yellow-800 mt-1">
                সমস্ত তথ্য সঠিকভাবে যাচাই করে Submit করুন।
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="rounded-xl border border-slate-300 px-6 py-3 font-bold text-slate-700 hover:bg-slate-50"
              >
                ফর্ম পরিষ্কার করুন
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex-1 rounded-xl bg-green-700 px-6 py-4 text-white text-lg font-bold hover:bg-green-800 disabled:opacity-60"
              >
                {saving ? "তথ্য জমা হচ্ছে..." : "✓ Census 2027 তথ্য জমা দিন"}
              </button>
            </div>
          </section>
        </form>
      </div>
    </main>
  );
}

/* ============================================================
   FORM SECTION
   ============================================================ */

function FormSection({ title, subtitle, fields, renderField }) {
  return (
    <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
      <div className="bg-green-50 px-5 py-4 border-b border-green-100">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>

        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
        {fields.map((field) => (
          <div
            key={field.key}
            className={field.type === "textarea" ? "md:col-span-2" : ""}
          >
            <label className="block mb-2">
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0 flex items-center justify-center min-w-7 h-7 rounded-lg bg-slate-800 text-white text-xs font-bold px-2">
                  {field.no}
                </span>

                <div>
                  <div className="font-semibold text-slate-800">
                    {field.bn}

                    {field.required && (
                      <span className="text-red-600 ml-1">*</span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500">{field.label}</div>
                </div>
              </div>
            </label>

            {renderField(field)}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   HOUSEHOLD INPUT
   ============================================================ */

function HouseholdInput({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-2">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
        placeholder={label}
      />
    </div>
  );
}
