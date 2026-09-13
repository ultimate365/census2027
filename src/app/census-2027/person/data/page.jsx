"use client";

import { useEffect, useMemo, useState } from "react";
import { auth, db } from "@/lib/firebase";

import { onAuthStateChanged } from "firebase/auth";

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
  serverTimestamp,
} from "firebase/firestore";

import { useRouter } from "next/navigation";

/* ============================================================
   COMMON OPTIONS
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
   FIELDS
   ============================================================ */

const FIELDS = [
  {
    no: 1,
    key: "name",
    label: "Name of the person",
    bn: "ব্যক্তির নাম",
    type: "text",
  },
  {
    no: 2,
    key: "relationshipToHead",
    label: "Relationship to head",
    bn: "গৃহপ্রধানের সঙ্গে সম্পর্ক",
    type: "select",
  },
  {
    no: 3,
    key: "sex",
    label: "Sex",
    bn: "লিঙ্গ",
    type: "select",
  },
  {
    no: 4,
    key: "dateOfBirth",
    label: "Date of Birth",
    bn: "জন্মতারিখ",
    type: "date",
  },
  {
    no: 5,
    key: "currentMaritalStatus",
    label: "Current Marital Status",
    bn: "বর্তমান বৈবাহিক অবস্থা",
    type: "select",
  },
  {
    no: 6,
    key: "ageAtMarriage",
    label: "Age at Marriage",
    bn: "বিবাহের সময় বয়স",
    type: "number",
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
    label: "Duration of stay",
    bn: "বসবাসের সময়কাল",
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
    type: "text",
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
   EMPTY FORM
   ============================================================ */

const EMPTY_FORM = {};

FIELDS.forEach((field) => {
  EMPTY_FORM[field.key] = "";
});

/* ============================================================
   MAIN
   ============================================================ */

export default function PersonDataPage() {
  const router = useRouter();

  const [user, setUser] = useState(null);

  const [records, setRecords] = useState([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [deleting, setDeleting] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState(null);

  const [editForm, setEditForm] = useState({
    ...EMPTY_FORM,
  });

  const [search, setSearch] = useState("");

  const [houseFilter, setHouseFilter] = useState("");

  const [error, setError] = useState("");

  const [message, setMessage] = useState("");

  /* ==========================================================
     AUTH
     ========================================================== */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setUser(null);

        router.replace("/login");

        return;
      }

      setUser(currentUser);
    });

    return () => unsubscribe();
  }, [router]);

  /* ==========================================================
     LOAD
     ========================================================== */

  useEffect(() => {
    if (!user) {
      return;
    }

    loadRecords();
  }, [user]);

  async function loadRecords() {
    setLoading(true);
    setError("");

    try {
      const recordsRef = collection(db, "census2027_persons");

      const q = query(
        recordsRef,

        where("enumeratorUid", "==", user.uid),

        orderBy("createdAt", "desc"),
      );

      const snapshot = await getDocs(q);

      const loaded = snapshot.docs.map((item) => ({
        id: item.id,

        ...item.data(),
      }));

      setRecords(loaded);
    } catch (err) {
      console.error("Load error:", err);

      /*
       * Fallback if composite index
       * is not yet available.
       */

      try {
        const recordsRef = collection(db, "census2027_persons");

        const q = query(recordsRef, where("enumeratorUid", "==", user.uid));

        const snapshot = await getDocs(q);

        const loaded = snapshot.docs.map((item) => ({
          id: item.id,

          ...item.data(),
        }));

        loaded.sort((a, b) => {
          const ad = a.createdAt?.seconds || 0;

          const bd = b.createdAt?.seconds || 0;

          return bd - ad;
        });

        setRecords(loaded);
      } catch (secondError) {
        console.error(secondError);

        setError(secondError?.message || "তথ্য লোড করা যায়নি।");
      }
    } finally {
      setLoading(false);
    }
  }

  /* ==========================================================
     FILTER
     ========================================================== */

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    const house = houseFilter.trim().toLowerCase();

    return records.filter((record) => {
      const searchable = [
        record.name,
        record.buildingNo,
        record.censusNo,
        record.householdId,
        record.mobileNumber,
        record.aadhaarNumber,
        record.voterId,
        record.enumeratorName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        (!term || searchable.includes(term)) &&
        (!house ||
          String(record.censusNo || "")
            .toLowerCase()
            .includes(house))
      );
    });
  }, [records, search, houseFilter]);

  /* ==========================================================
     EDIT
     ========================================================== */

  function openEdit(record) {
    setSelectedRecord(record);

    const newForm = {
      ...EMPTY_FORM,
    };

    FIELDS.forEach((field) => {
      newForm[field.key] = record[field.key] ?? "";
    });

    setEditForm(newForm);

    setError("");
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function closeEdit() {
    setSelectedRecord(null);

    setEditForm({
      ...EMPTY_FORM,
    });
  }

  function handleEditChange(key, value) {
    setEditForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  /* ==========================================================
     UPDATE
     ========================================================== */

  async function handleUpdate(event) {
    event.preventDefault();

    if (!selectedRecord?.id) {
      return;
    }

    if (!user) {
      setError("আপনি লগইন করেননি।");

      return;
    }

    if (!String(editForm.name || "").trim()) {
      setError("ব্যক্তির নাম অবশ্যই দিতে হবে।");

      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const recordRef = doc(db, "census2027_persons", selectedRecord.id);

      await updateDoc(recordRef, {
        ...editForm,

        /*
         * Ownership is explicitly preserved.
         */

        enumeratorUid: user.uid,

        enumeratorEmail: selectedRecord.enumeratorEmail || user.email || "",

        enumeratorName: selectedRecord.enumeratorName || "",

        phase: "individual",

        censusYear: 2027,

        updatedAt: serverTimestamp(),
      });

      setMessage("তথ্য সফলভাবে আপডেট হয়েছে।");

      await loadRecords();

      closeEdit();

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (err) {
      console.error("Update error:", err);

      setError(err?.message || "তথ্য আপডেট করা যায়নি।");
    } finally {
      setSaving(false);
    }
  }

  /* ==========================================================
     DELETE
     ========================================================== */

  async function handleDelete(record) {
    if (!record?.id) {
      return;
    }

    const confirmed = window.confirm(
      `আপনি কি "${record.name || "এই ব্যক্তির"}" তথ্যটি স্থায়ীভাবে মুছে ফেলতে চান?\n\nএই কাজটি Undo করা যাবে না।`,
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError("");
    setMessage("");

    try {
      await deleteDoc(doc(db, "census2027_persons", record.id));

      setRecords((previous) =>
        previous.filter((item) => item.id !== record.id),
      );

      if (selectedRecord?.id === record.id) {
        closeEdit();
      }

      setMessage("তথ্য সফলভাবে মুছে ফেলা হয়েছে।");
    } catch (err) {
      console.error("Delete error:", err);

      setError(err?.message || "তথ্য মুছে ফেলা যায়নি।");
    } finally {
      setDeleting(false);
    }
  }

  /* ==========================================================
     DATE
     ========================================================== */

  function formatDate(value) {
    if (!value) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    if (value?.toDate) {
      return value.toDate().toLocaleDateString("en-IN");
    }

    return String(value);
  }

  function getCreatedDate(record) {
    if (record.createdAt?.toDate) {
      return record.createdAt.toDate().toLocaleString("en-IN");
    }

    return "";
  }

  /* ==========================================================
     EDIT FIELD
     ========================================================== */

  function renderEditField(field) {
    const value = editForm[field.key] ?? "";

    const inputClass =
      "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100";

    /* SELECT */

    if (field.type === "select") {
      return (
        <select
          value={value}
          onChange={(e) => handleEditChange(field.key, e.target.value)}
          className={inputClass}
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
          rows={3}
          onChange={(e) => handleEditChange(field.key, e.target.value)}
          className={inputClass}
        />
      );
    }

    return (
      <input
        type={field.type}
        value={value}
        onChange={(e) => handleEditChange(field.key, e.target.value)}
        className={inputClass}
      />
    );
  }

  /* ==========================================================
     LOADING
     ========================================================== */

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow p-8">Loading...</div>
      </main>
    );
  }

  /* ==========================================================
     PAGE
     ========================================================== */

  return (
    <main className="min-h-screen bg-slate-100 px-3 py-6 sm:px-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER */}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="bg-green-700 text-white px-5 py-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">Census 2027</h1>

                <p className="text-green-100 mt-1">
                  Individual Data — View & Manage
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/census-2027/person")}
                className="rounded-xl bg-white px-4 py-2 font-bold text-green-700 hover:bg-green-50"
              >
                + নতুন তথ্য
              </button>
            </div>
          </div>

          {/* STATS */}

          <div className="p-5 grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="মোট তথ্য" value={records.length} />

            <StatCard label="Search Result" value={filteredRecords.length} />

            <StatCard
              label="Census House"
              value={
                new Set(
                  records.map((record) => record.censusNo).filter(Boolean),
                ).size
              }
            />

            <StatCard label="Enumerator" value={user.email || "-"} small />
          </div>
        </div>

        {/* ALERTS */}

        {message && (
          <div className="mb-5 rounded-xl border border-green-300 bg-green-50 px-5 py-4 text-green-800">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-300 bg-red-50 px-5 py-4 text-red-800">
            {error}
          </div>
        )}

        {/* ====================================================
            EDIT FORM
            ==================================================== */}

        {selectedRecord && (
          <section className="bg-white rounded-2xl shadow-lg border border-green-200 overflow-hidden mb-6">
            <div className="bg-green-50 border-b border-green-200 px-5 py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">ব্যক্তির তথ্য পরিবর্তন</h2>

                  <p className="text-sm text-slate-600">
                    {selectedRecord.name || "Unnamed"}
                    {" • "}
                    Census House: {selectedRecord.censusNo || "-"}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-bold"
                >
                  ✕ বন্ধ করুন
                </button>
              </div>
            </div>

            <form onSubmit={handleUpdate} className="p-5">
              {/* HOUSE */}

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 mb-6">
                <h3 className="font-bold mb-3">গৃহের তথ্য</h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <ReadOnlyBox
                    label="Building No."
                    value={selectedRecord.buildingNo}
                  />

                  <ReadOnlyBox
                    label="Census House No."
                    value={selectedRecord.censusNo}
                  />

                  <ReadOnlyBox
                    label="Household ID"
                    value={selectedRecord.householdId}
                  />
                </div>
              </div>

              {/* FIELDS */}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {FIELDS.map((field) => (
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
                          </div>

                          <div className="text-xs text-slate-500">
                            {field.label}
                          </div>
                        </div>
                      </div>
                    </label>

                    {renderEditField(field)}
                  </div>
                ))}
              </div>

              {/* ACTION */}

              <div className="mt-7 pt-5 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-green-700 px-6 py-4 text-white text-lg font-bold hover:bg-green-800 disabled:opacity-60"
                >
                  {saving ? "আপডেট হচ্ছে..." : "✓ পরিবর্তন সংরক্ষণ করুন"}
                </button>

                <button
                  type="button"
                  onClick={closeEdit}
                  className="rounded-xl border border-slate-300 px-6 py-4 font-bold"
                >
                  বাতিল
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ====================================================
            SEARCH
            ==================================================== */}

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_250px_auto] gap-3">
            <div>
              <label className="block text-sm font-semibold mb-2">Search</label>

              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="নাম / Census No. / Building No. / Mobile / ID..."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">
                Census House
              </label>

              <input
                type="text"
                value={houseFilter}
                onChange={(e) => setHouseFilter(e.target.value)}
                placeholder="Census No."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setHouseFilter("");
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 font-semibold"
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        {/* ====================================================
            LIST
            ==================================================== */}

        <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold">সংগৃহীত ব্যক্তিগত তথ্য</h2>

            <p className="text-sm text-slate-500">
              {filteredRecords.length} টি record
            </p>
          </div>

          {loading ? (
            <div className="p-10 text-center">⏳ তথ্য লোড হচ্ছে...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-5xl">📋</div>

              <p className="font-bold text-lg mt-3">কোনও তথ্য পাওয়া যায়নি</p>
            </div>
          ) : (
            <>
              {/* DESKTOP */}

              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>

                      <th className="px-4 py-3 text-left">ব্যক্তির নাম</th>

                      <th className="px-4 py-3 text-left">Census House</th>

                      <th className="px-4 py-3 text-left">সম্পর্ক</th>

                      <th className="px-4 py-3 text-left">লিঙ্গ</th>

                      <th className="px-4 py-3 text-left">জন্মতারিখ</th>

                      <th className="px-4 py-3 text-left">মোবাইল</th>

                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.map((record, index) => (
                      <tr key={record.id} className="hover:bg-green-50">
                        <td className="px-4 py-4">{index + 1}</td>

                        <td className="px-4 py-4">
                          <div className="font-bold">{record.name || "-"}</div>

                          <div className="text-xs text-slate-500">
                            {record.aadhaarNumber
                              ? `Aadhaar: ${record.aadhaarNumber}`
                              : ""}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="font-semibold">
                            {record.censusNo || "-"}
                          </div>

                          <div className="text-xs text-slate-500">
                            Building: {record.buildingNo || "-"}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          {record.relationshipToHead || "-"}
                        </td>

                        <td className="px-4 py-4">{record.sex || "-"}</td>

                        <td className="px-4 py-4">
                          {formatDate(record.dateOfBirth)}
                        </td>

                        <td className="px-4 py-4">
                          {record.mobileNumber || "-"}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEdit(record)}
                              className="rounded-lg bg-blue-600 px-3 py-2 text-white font-bold"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(record)}
                              disabled={deleting}
                              className="rounded-lg bg-red-600 px-3 py-2 text-white font-bold disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE */}

              <div className="lg:hidden divide-y divide-slate-200">
                {filteredRecords.map((record, index) => (
                  <div key={record.id} className="p-5">
                    <div className="flex justify-between gap-3">
                      <div>
                        <div className="text-xs text-slate-500">
                          #{index + 1}
                        </div>

                        <h3 className="text-lg font-bold">
                          {record.name || "নাম নেই"}
                        </h3>
                      </div>

                      <span className="bg-green-100 text-green-700 rounded-lg px-3 py-1 h-fit text-xs font-bold">
                        Census {record.censusNo || "-"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <InfoItem
                        label="Building No."
                        value={record.buildingNo}
                      />

                      <InfoItem
                        label="সম্পর্ক"
                        value={record.relationshipToHead}
                      />

                      <InfoItem label="লিঙ্গ" value={record.sex} />

                      <InfoItem
                        label="জন্মতারিখ"
                        value={formatDate(record.dateOfBirth)}
                      />

                      <InfoItem label="মোবাইল" value={record.mobileNumber} />

                      <InfoItem
                        label="Household ID"
                        value={record.householdId}
                      />
                    </div>

                    <div className="text-xs text-slate-500 mt-4">
                      Submitted: {getCreatedDate(record)}
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => openEdit(record)}
                        className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-white font-bold"
                      >
                        ✎ Edit
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDelete(record)}
                        disabled={deleting}
                        className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-white font-bold disabled:opacity-50"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

/* ============================================================
   COMPONENTS
   ============================================================ */

function StatCard({ label, value, small = false }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
      <div className="text-xs text-slate-500">{label}</div>

      <div
        className={`mt-1 font-bold ${small ? "text-xs break-all" : "text-2xl"}`}
      >
        {value}
      </div>
    </div>
  );
}

function ReadOnlyBox({ label, value }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>

      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold">
        {value || "-"}
      </div>
    </div>
  );
}

function InfoItem({ label, value }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3">
      <div className="text-xs text-slate-500">{label}</div>

      <div className="font-semibold mt-1 break-words">{value || "-"}</div>
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (value?.toDate) {
    return value.toDate().toLocaleDateString("en-IN");
  }

  return String(value);
}
