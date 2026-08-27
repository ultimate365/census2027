"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";
import { CensusPDFButton, CensusBulkPDFButton } from "@/pdf/Census2027PDF";
import { Census2027DataSheetDownloadButton } from "@/pdf/Census2027DataSheet";
const createDownloadLink = (myData, fileName) => {
  const json = JSON.stringify(myData, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const href = URL.createObjectURL(blob);

  // create "a" HTLM element with href to file
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName + ".json";
  document.body.appendChild(link);
  link.click();

  // clean up "a" element & remove ObjectURL
  document.body.removeChild(link);
  URL.revokeObjectURL(href);
};
function sortByBuildingNo(data) {
  return [...data].sort((first, second) => {
    const firstBuildingNo = first.buildingNo ?? "";
    const secondBuildingNo = second.buildingNo ?? "";
    const firstNumber = Number(
      firstBuildingNo.match(/\d+/)?.[0] ?? Number.POSITIVE_INFINITY,
    );
    const secondNumber = Number(
      secondBuildingNo.match(/\d+/)?.[0] ?? Number.POSITIVE_INFINITY,
    );

    if (firstNumber !== secondNumber) {
      return firstNumber - secondNumber;
    }

    const buildingOrder = firstBuildingNo.localeCompare(
      secondBuildingNo,
      undefined,
      {
        numeric: true,
      },
    );

    if (buildingOrder !== 0) {
      return buildingOrder;
    }

    const firstCreatedAt = getRecordTimestamp(first.createdAt);
    const secondCreatedAt = getRecordTimestamp(second.createdAt);

    if (firstCreatedAt === null && secondCreatedAt === null) {
      return first.id.localeCompare(second.id);
    }

    if (firstCreatedAt === null) return 1;
    if (secondCreatedAt === null) return -1;

    return (
      firstCreatedAt - secondCreatedAt || first.id.localeCompare(second.id)
    );
  });
}

const editSelectOptions = {
  selfEnumeration: ["হ্যাঁ", "না"],
  floorMaterial: [
    "মাটি",
    "কাঠ/বাঁশ",
    "পোড়া ইট",
    "পাথর",
    "সিমেন্ট",
    "মোজাইক/মেঝের টাইল",
    "অন্যান্য",
  ],
  wallMaterial: [
    "ঘাস/খড়/বাঁশ",
    "প্লাস্টিক/পলিথিন",
    "মাটি/কাঁচা ইট",
    "কাঠ",
    "গাঁথুনি না করা পাথর",
    "পাথর",
    "GI শীট/মেটাল/অ্যাসবেস্টস শিট",
    "পোড়া ইট",
    "কংক্রিট",
    "অন্যান্য",
  ],
  roofMaterial: [
    "ঘাস/খড়/বাঁশ",
    "কাঠ",
    "মাটি",
    "প্লাস্টিক/পলিথিন",
    "হাতে তৈরি টালি",
    "মেশিনে তৈরি টালি",
    "পোড়া ইট",
    "পাথর",
    "স্লেট পাথর",
    "GI শীট/মেটাল/অ্যাসবেস্টস শিট",
    "কংক্রিট",
    "অন্যান্য",
  ],
  houseUse: [
    "বাসগৃহ",
    "বাসগৃহ-সহ অন্যান্য",
    "দোকান/অফিস",
    "স্কুল/কলেজ",
    "হোটেল/নিবাস/অতিথিশালা",
    "হাসপাতাল/স্বাস্থ্যকেন্দ্র",
    "কারখানা/ওয়ার্কশপ",
    "ধর্মীয় স্থান",
    "বাসগৃহ ছাড়া অন্য ব্যবহার",
    "খালি",
  ],
  houseCondition: ["ভালো", "বাসযোগ্য", "ক্ষতিগ্রস্ত"],
  headSex: ["পুরুষ", "মহিলা", "অন্যান্য"],
  caste: ["তপশিলি জাতি", "তপশিলি উপজাতি", "অন্যান্য"],
  houseOwnership: [
    "নিজের",
    "ভাড়া, অন্য বাড়ি আছে",
    "ভাড়া, বাড়ি নেই",
    "অন্যান্য",
  ],
  drinkingWaterSource: [
    "পরিশুদ্ধ কলের জল",
    "অ-পরিশুদ্ধ কলের জল",
    "কুয়ো",
    "হ্যান্ড পাম্প",
    "টিউবওয়েল/বোরহোল",
    "ঝরনার জল",
    "নদী/খাল",
    "জলাধার/পুকুর/বিল",
    "বোতলে কেনা জল",
    "অন্যান্য",
  ],
  drinkingWaterLocation: [
    "বাড়ির চৌহদ্দির মধ্যে",
    "বাড়ির চৌহদ্দির কাছে",
    "দূরে",
  ],
  lightingSource: [
    "বিদ্যুৎ",
    "কেরোসিন",
    "সৌরবিদ্যুৎ",
    "অন্যান্য তেল",
    "অন্য উৎস",
    "আলো নেই",
  ],
  latrineAvailability: [
    "শুধু এই পরিবারের",
    "যৌথভাবে",
    "সর্বসাধারণের",
    "খোলা জায়গায়",
  ],
  latrineType: [
    "নলবাহিত পূর্ণশৌচালয়",
    "সেপটিক ট্যাঙ্ক",
    "অন্যান্য",
    "দুটি কুয়ো/পিটযুক্ত",
    "একটি কুয়ো/পিটযুক্ত",
    "কাঁচা পায়খানা",
    "মানুষ দ্বারা বাহিত",
    "পশু দ্বারা বাহিত",
    "খোলা নর্দমা দ্বারা",
  ],
  wasteWaterDrain: ["ঢাকা নর্দমা", "খোলা নর্দমা", "কোন নর্দমা নেই"],
  bathingArrangement: [
    "স্নানের ঘর আছে",
    "ছাদবিহীন ঘেরা জায়গা আছে",
    "না, ব্যবস্থা নেই",
  ],
  cookingGas: [
    "সংযোগ আছে",
    "সংযোগ নেই",
    "বাড়ির ভিতরে রান্নার চুলা",
    "বাড়ির বাইরে/খোলা জায়গায় রান্নার চুলা",
    "রান্না হয় না",
  ],
  cookingFuel: [
    "জ্বালানি কাঠ",
    "গোবরের পরিত্যক্ত অংশ",
    "খড়/কয়লা",
    "কয়লা/লিগনাইট/কাঠ কয়লা",
    "কেরোসিন",
    "রান্নার গ্যাস (LPG/CNG)",
    "বিদ্যুৎ",
    "বায়োগ্যাস",
    "সৌর শক্তি",
    "অন্যান্য",
  ],
  radio: ["সাধারণ রেডিও", "মোবাইল/স্মার্টফোন", "অন্যান্য", "না"],
  television: [
    "দূরদর্শন DTH",
    "স্যাটেলাইট",
    "অন্যান্য DTH",
    "কেবল সংযোগ",
    "অন্যান্য",
    "না",
  ],
  internet: ["মোবাইল ডেটা", "ব্রডব্যান্ড", "Wi-Fi", "অন্যান্য", "না"],
  laptopComputer: ["হ্যাঁ", "না"],
  mobilePhone: [
    "ল্যান্ডলাইন",
    "সাধারণ মোবাইল",
    "স্মার্টফোন",
    "ল্যান্ডলাইন ও মোবাইল উভয়",
    "না",
  ],
  bicycleVehicle: [
    "সাইকেল",
    "স্কুটার/মোটরসাইকেল/মোপেড",
    "দুটিই আছে",
    "কোনোটিই নেই",
  ],
  carVan: ["হ্যাঁ", "না"],
  mainFoodGrain: ["ধান", "গম", "জোয়ার", "বাজরা", "ভুট্টা", "অন্যান্য"],
};

const getRecordTimestamp = (value) => {
  if (!value) return null;

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.seconds === "number") {
    return value.seconds * 1000 + (value.nanoseconds || 0) / 1000000;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

const compareRecordsBySubmission = (first, second) => {
  const firstTime =
    getRecordTimestamp(first.submittedAt) ??
    getRecordTimestamp(first.createdAt);
  const secondTime =
    getRecordTimestamp(second.submittedAt) ??
    getRecordTimestamp(second.createdAt);

  if (firstTime === null && secondTime === null) {
    return first.id.localeCompare(second.id);
  }

  if (firstTime === null) return 1;
  if (secondTime === null) return -1;

  return secondTime - firstTime || first.id.localeCompare(second.id);
};

export default function MyDataPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [villageFilter, setVillageFilter] = useState("all");
  const [sortByBuilding, setSortByBuilding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("/login");
        return;
      }

      try {
        const profileSnap = await getDoc(
          doc(db, "enumerators", currentUser.uid),
        );
        const currentProfile = profileSnap.exists() ? profileSnap.data() : null;

        if (!currentProfile || currentProfile.status !== "active") {
          router.replace("/");
          return;
        }

        setUser(currentUser);
        setProfile(currentProfile);

        const recordsSnapshot = await getDocs(
          query(
            collection(db, "census2027"),
            where("enumeratorUid", "==", currentUser.uid),
          ),
        );

        const loadedRecords = recordsSnapshot.docs
          .map((item) => ({ id: item.id, ...item.data() }))
          .sort(compareRecordsBySubmission);

        setRecords(loadedRecords);
      } catch (loadError) {
        console.error("My data loading error:", loadError);
        setError(loadError.message || "আপনার data load করা যায়নি।");
      } finally {
        setCheckingAuth(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const villages = useMemo(() => {
    const values = records.map((record) => record.village).filter(Boolean);
    return [...new Set(values)].sort((a, b) =>
      String(a).localeCompare(String(b)),
    );
  }, [records]);

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    return records.filter((record) => {
      const searchableText = [
        record.householdId,
        record.censusNo,
        record.buildingNo,
        record.headName,
        record.village,
        record.locality,
        record.district,
        record.enumeratorId,
        record.enumeratorName,
        record.enumeratorMobile,
        record.headMobile,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || searchableText.includes(term);
      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;
      const matchesVillage =
        villageFilter === "all" || record.village === villageFilter;

      return matchesSearch && matchesStatus && matchesVillage;
    });
  }, [records, search, statusFilter, villageFilter]);

  const displayedRecords = useMemo(
    () =>
      sortByBuilding ? sortByBuildingNo(filteredRecords) : filteredRecords,
    [filteredRecords, sortByBuilding],
  );

  const formatDate = (value) => {
    if (!value) return "—";

    try {
      let date;

      if (typeof value.toDate === "function") {
        date = value.toDate();
      } else if (value.seconds) {
        date = new Date(value.seconds * 1000);
      } else {
        date = new Date(value);
      }

      if (Number.isNaN(date.getTime())) {
        return "—";
      }

      return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "—";
    }
  };

  const handleView = (record) => {
    setSelectedRecord(record);
    setShowDetails(true);
  };

  const handleEdit = (record) => {
    setEditingRecord({ ...record });
    setMessage("");
    setMessageType("success");
  };

  const handleEditChange = (event) => {
    const { name, value } = event.target;

    if (name === "selfEnumeration") {
      setEditingRecord((prev) => ({
        ...prev,
        selfEnumeration: value,
        selfEnumerationID:
          value !== "হ্যাঁ" ? "" : prev?.selfEnumerationID || "",
      }));
      return;
    }

    if (name === "selfEnumerationID") {
      const nextValue = value
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 12)
        .toUpperCase();
      setEditingRecord((prev) => ({ ...prev, selfEnumerationID: nextValue }));
      return;
    }

    setEditingRecord((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveEdit = async () => {
    if (!editingRecord?.id || !user) return;

    if (editingRecord.enumeratorUid !== user.uid) {
      setError("এই record update করার অনুমতি আপনার নেই।");
      return;
    }

    const dataToSave = { ...editingRecord };
    delete dataToSave.id;

    if (dataToSave.selfEnumeration === "হ্যাঁ") {
      if (!/^[A-Z0-9]{12}$/.test(dataToSave.selfEnumerationID || "")) {
        setMessage(
          "Self Enumeration ID অবশ্যই ১২ অক্ষরের Capital Alpha Numeric Code হতে হবে।",
        );
        setMessageType("error");
        return;
      }
    }

    ["enumeratorUid", "submittedAt", "createdAt", "updatedAt"].forEach(
      (field) => delete dataToSave[field],
    );

    const numericFields = [
      "householdNo",
      "householdMembers",
      "roomCount",
      "maleMembers",
      "femaleMembers",
      "otherMembers",
      "marriedCouples",
      "latitude",
      "longitude",
    ];

    numericFields.forEach((field) => {
      if (!(field in dataToSave)) return;
      dataToSave[field] =
        dataToSave[field] === "" ||
        dataToSave[field] === null ||
        dataToSave[field] === undefined
          ? null
          : Number(dataToSave[field]);
    });

    try {
      setSaving(true);
      setError("");
      await updateDoc(doc(db, "census2027", editingRecord.id), {
        ...dataToSave,
        updatedAt: serverTimestamp(),
        lastModifiedBy: user.uid,
        lastModifiedByEmail: user.email || "",
      });

      setRecords((current) =>
        current.map((record) =>
          record.id === editingRecord.id
            ? { ...record, ...dataToSave }
            : record,
        ),
      );
      setEditingRecord(null);
      setMessage("Census record সফলভাবে update হয়েছে।");
      setMessageType("success");
    } catch (saveError) {
      console.error("My data update error:", saveError);
      setError(saveError.message || "Record update করা যায়নি।");
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (record) => {
    if (!user || record.enumeratorUid !== user.uid) {
      setError("এই record delete করার অনুমতি আপনার নেই।");
      return;
    }

    const confirmed = window.confirm(
      `Household ID: ${record.householdId || "—"} delete করবেন?`,
    );

    if (!confirmed) return;

    try {
      setError("");
      await deleteDoc(doc(db, "census2027", record.id));
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setSelectedRecord(null);
      setShowDetails(false);
      setMessage("Record সফলভাবে delete হয়েছে।");
      setMessageType("success");
    } catch (deleteError) {
      console.error("My data delete error:", deleteError);
      setError(deleteError.message || "Record delete করা যায়নি।");
      setMessageType("error");
    }
  };

  const closeDetails = () => {
    setShowDetails(false);
    setSelectedRecord(null);
  };

  const closeEdit = () => {
    if (saving) return;
    setEditingRecord(null);
  };

  if (checkingAuth) return <LoadingState label="Checking authentication..." />;
  if (!user || !profile) return null;

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gray-100 px-3 py-5 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-green-950 via-green-800 to-green-600 text-white shadow-lg">
          <div className="flex flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-green-200">
                {profile?.name || user?.name || user?.email || "Enumerator"}
              </div>
              <h1 className="mt-1 text-xl font-black sm:text-2xl">
                Your Submitted Data
              </h1>
              <p className="mt-1 text-sm text-green-100">
                আপনার submit করা {records.length}টি household record এখানে
                দেখুন।
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow transition hover:bg-orange-600"
                onClick={() => {
                  createDownloadLink(
                    displayedRecords,
                    user?.email?.split("@")[0] || "Enumerator",
                  );
                }}
              >
                Download JSON Data
              </button>
              <CensusBulkPDFButton records={displayedRecords} />
              <Census2027DataSheetDownloadButton records={displayedRecords} />
              <button
                type="button"
                onClick={() => setSortByBuilding((current) => !current)}
                className={`rounded-lg px-4 py-2.5 text-sm font-bold shadow transition ${
                  sortByBuilding
                    ? "bg-yellow-300 text-green-950 hover:bg-yellow-200"
                    : "border border-white/30 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {sortByBuilding ? "Building Order On" : "Sort by Building No."}
              </button>
              <button
                type="button"
                onClick={() => setSortByBuilding(false)}
                disabled={!sortByBuilding}
                className={`rounded-lg px-4 py-2.5 text-sm font-bold shadow transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  !sortByBuilding
                    ? "bg-yellow-300 text-green-950"
                    : "border border-white/30 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                Submitted Time Order
              </button>
              <button
                type="button"
                onClick={() => router.push("/census-2027")}
                className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-green-800 shadow transition hover:bg-green-50"
              >
                + New Data
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20"
              >
                ↻ Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Total Records" value={records.length} icon="📋" />
          <StatCard
            label="Filtered Records"
            value={filteredRecords.length}
            icon="🔎"
          />
          <StatCard label="Access Level" value="Enumerator" icon="👤" />
        </div>

        {message && (
          <div
            className={`mb-5 flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${
              messageType === "success"
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage("")}
              className="font-bold opacity-60 hover:opacity-100"
            >
              ×
            </button>
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-xl border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-800">
            <p className="font-bold">Error</p>
            <p className="mt-1">{error}</p>
          </div>
        )}

        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="font-bold text-gray-800">Search & Filter</h2>
            <p className="mt-1 text-xs text-gray-500">
              Search using Household ID, Census No., Head Name, Village or
              locality.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="mb-1.5 block text-xs font-bold text-gray-600">
                Search
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔎
                </span>
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search records..."
                  className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-600">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              >
                <option value="all">All Status</option>
                <option value="submitted">Submitted</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-gray-600">
                Village / Locality
              </label>
              <select
                value={villageFilter}
                onChange={(e) => setVillageFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              >
                <option value="all">All Villages</option>
                {villages.map((village) => (
                  <option key={village} value={village}>
                    {village}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {(search || statusFilter !== "all" || villageFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
                setVillageFilter("all");
              }}
              className="mt-3 text-xs font-bold text-red-600 hover:text-red-800"
            >
              Clear all filters
            </button>
          )}
        </div>

        {loading ? (
          <LoadingState />
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            hasRecords={records.length > 0}
            onNew={() => router.push("/census-2027")}
          />
        ) : (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:block">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3 text-center">Household</th>
                      <th className="px-4 py-3 text-center">
                        Building / Census
                      </th>
                      <th className="px-4 py-3 text-center">
                        Head of Household
                      </th>
                      <th className="px-4 py-3 text-center">Mobile No.</th>
                      {/* <th className="px-4 py-3">Location</th> */}
                      <th className="px-4 py-3 text-center">Members</th>
                      {/* <th className="px-4 py-3">Status</th> */}
                      <th className="px-4 py-3 text-center">Submitted</th>
                      <th className="px-4 py-3 text-center">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {displayedRecords.map((record) => (
                      <RecordRow
                        key={record.id}
                        record={record}
                        onView={handleView}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        formatDate={formatDate}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {displayedRecords.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  formatDate={formatDate}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {showDetails && selectedRecord && (
        <DetailsModal
          record={selectedRecord}
          onClose={closeDetails}
          onEdit={() => {
            setShowDetails(false);
            handleEdit(selectedRecord);
          }}
          onDelete={() => {
            setShowDetails(false);
            handleDelete(selectedRecord);
          }}
          formatDate={formatDate}
        />
      )}

      {editingRecord && (
        <EditModal
          record={editingRecord}
          loading={saving}
          onChange={handleEditChange}
          onSave={handleSaveEdit}
          onClose={closeEdit}
        />
      )}
    </main>
  );
}

function StatCard({ label, value, icon }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500">{label}</p>
          <p className="mt-1 text-2xl font-black text-gray-800">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-xl">
          {icon}
        </div>
      </div>
    </div>
  );
}

function RecordRow({ record, onView, onEdit, onDelete, formatDate }) {
  return (
    <tr className="border-b border-gray-100 transition hover:bg-green-50/40">
      <td className="px-4 py-4">
        <p className="font-bold text-gray-800">{record.householdId || "—"}</p>
        <StatusBadge status={record.status} />
      </td>

      <td className="px-4 py-4">
        <p className="text-sm font-semibold text-gray-700">
          {record.buildingNo || "—"}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          Census: {record.censusNo || "—"}
        </p>
      </td>

      <td className="px-4 py-4">
        <p className="text-sm font-bold text-gray-800">
          {record.headName || "—"}
        </p>
        <p className="mt-0.5 text-xs text-gray-500">
          লিঙ্গ: {record.headSex || "—"}
        </p>
        {/* {record.headMobile && (
          <p className="mt-0.5 text-xs text-gray-500">{record.headMobile}</p>
        )} */}
      </td>
      <td className="px-4 py-4">
        {record.headMobile && <PhoneLink value={record.headMobile} />}
      </td>

      {/* <td className="px-4 py-4">
        <p className="text-sm text-gray-700">{record.village || "—"}</p>
        <p className="mt-0.5 text-xs text-gray-500">{record.district || ""}</p>
      </td> */}

      <td className="px-4 py-4">
        <p className="text-sm font-bold text-gray-800">
          {record.householdMembers ?? "—"}
        </p>
      </td>

      {/* <td className="px-4 py-4">
        <StatusBadge status={record.status} />
      </td> */}

      <td className="whitespace-nowrap px-4 py-4 text-xs text-gray-500">
        {formatDate(record.submittedAt)}
      </td>

      <td className="px-4 py-4">
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            onClick={() => onView(record)}
            title="View"
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            View
          </button>

          <button
            type="button"
            onClick={() => onEdit(record)}
            title="Edit"
            className="rounded-lg bg-blue-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-blue-700"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => onDelete(record)}
            title="Delete"
            className="rounded-lg bg-red-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-red-700"
          >
            Delete
          </button>
          <CensusPDFButton data={record} />
        </div>
      </td>
    </tr>
  );
}

function RecordCard({ record, onView, onEdit, onDelete, formatDate }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-gray-500">Household ID</p>
            <p className="mt-0.5 font-black text-gray-800">
              {record.householdId || "—"}
            </p>
          </div>
          <StatusBadge status={record.status} />
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="grid grid-cols-2 gap-3">
          <MiniInfo label="Head Name" value={record.headName} />
          <MiniInfo label="Head Sex" value={record.headSex} />
          <MiniInfo label="Members" value={record.householdMembers} />
          <MiniInfo label="Building No." value={record.buildingNo} />
          <MiniInfo label="Census No." value={record.censusNo} />
          <PhoneInfo label="Mobile No." value={record.headMobile} />
          <MiniInfo label="Village" value={record.village} />
        </div>

        <div className="rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-gray-500">Submitted</p>
          <p className="mt-1 text-xs font-semibold text-gray-700">
            {formatDate(record.submittedAt)}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onView(record)}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            View
          </button>

          <button
            type="button"
            onClick={() => onEdit(record)}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-blue-700"
          >
            Edit
          </button>

          <button
            type="button"
            onClick={() => onDelete(record)}
            className="flex-1 rounded-lg bg-red-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-red-700"
          >
            Delete
          </button>
          <CensusPDFButton data={record} />
        </div>
      </div>
    </div>
  );
}

function MiniInfo({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-gray-700">
        {value ?? "—"}
      </p>
    </div>
  );
}

function PhoneInfo({ label, value }) {
  if (!value) return null;

  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-400">{label}</p>
      <PhoneLink value={value} />
    </div>
  );
}

function PhoneLink({ value }) {
  if (!value) return null;

  const phoneNumber = String(value).replace(/[^\d+]/g, "");

  return (
    <a
      href={`tel:${phoneNumber}`}
      className="mt-0.5 block text-sm font-semibold text-green-700 hover:text-green-800 hover:underline"
    >
      {value}
    </a>
  );
}

function StatusBadge({ status }) {
  const normalized = status || "unknown";
  let classes = "bg-gray-100 text-gray-600";

  if (normalized === "submitted") classes = "bg-blue-100 text-blue-700";
  if (normalized === "verified") classes = "bg-green-100 text-green-700";
  if (normalized === "pending") classes = "bg-yellow-100 text-yellow-700";

  return (
    <span
      className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ${classes}`}
    >
      {normalized}
    </span>
  );
}

function DetailsModal({ record, onClose, onEdit, onDelete, formatDate }) {
  const hasGpsValues =
    record.latitude !== null &&
    record.latitude !== undefined &&
    record.latitude !== "" &&
    record.longitude !== null &&
    record.longitude !== undefined &&
    record.longitude !== "";

  const latitude = Number(record.latitude);
  const longitude = Number(record.longitude);
  const hasGpsLocation =
    hasGpsValues &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  const sections = [
    {
      title: "Identification",
      fields: [
        // ["Household ID", record.householdId],
        // ["Survey Year", record.surveyYear],
        // ["Status", record.status],
        ["Building No.", record.buildingNo],
        ["Census No.", record.censusNo],
        ["Mobile No.", record.mobileNo],
      ],
    },
    // {
    //   title: "Enumerator",
    //   fields: [
    //     ["Enumerator ID", record.enumeratorId],
    //     ["Enumerator Name", record.enumeratorName],
    //     ["Enumerator Mobile", record.enumeratorMobile],
    //     ["Enumerator Email", record.enumeratorEmail],
    //     ["Enumerator UID", record.enumeratorUid],
    //   ],
    // },
    // {
    //   title: "Administrative Information",
    //   fields: [
    //     ["State", record.state],
    //     ["District", record.district],
    //     ["Subdivision", record.subdivision],
    //     ["Block", record.block],
    //     ["Gram Panchayat", record.gramPanchayat],
    //     ["Ward", record.ward],
    //     ["Village", record.village],
    //     ["Locality", record.locality],
    //     ["PIN Code", record.pinCode],
    //     ["House Address", record.houseAddress],
    //   ],
    // },
    {
      title: "Household",
      fields: [
        ["Head Name", record.headName],
        ["Head Sex", record.headSex],
        ["Head Mobile", record.headMobile],
        ["পরিবার সংখ্যা", record.householdNo],
        ["Self Enumeration", record.selfEnumeration],
        ["Self Enumeration ID", record.selfEnumerationID],
        ["Total Members", record.householdMembers],
        ["Male Members", record.maleMembers],
        ["Female Members", record.femaleMembers],
        ["Other Members", record.otherMembers],
        ["Married Couples", record.marriedCouples],
        ["Caste", record.caste],
        ["House Ownership", record.houseOwnership],
      ],
    },
    {
      title: "House Information",
      fields: [
        ["Floor Material", record.floorMaterial],
        ["Wall Material", record.wallMaterial],
        ["Roof Material", record.roofMaterial],
        ["House Use", record.houseUse],
        ["House Condition", record.houseCondition],
        ["Number of Rooms", record.roomCount],
      ],
    },
    {
      title: "Water & Sanitation",
      fields: [
        ["Drinking Water Source", record.drinkingWaterSource],
        ["Water Location", record.drinkingWaterLocation],
        ["Latrine Availability", record.latrineAvailability],
        ["Latrine Type", record.latrineType],
        ["Waste Water Drain", record.wasteWaterDrain],
        ["Bathing Arrangement", record.bathingArrangement],
      ],
    },
    {
      title: "Lighting & Cooking",
      fields: [
        ["Lighting Source", record.lightingSource],
        ["Cooking Gas", record.cookingGas],
        ["Cooking Fuel", record.cookingFuel],
      ],
    },
    {
      title: "Technology & Assets",
      fields: [
        ["Radio", record.radio],
        ["Television", record.television],
        ["Internet", record.internet],
        ["Laptop / Computer", record.laptopComputer],
        ["Mobile Phone", record.mobilePhone],
        ["Bicycle / Vehicle", record.bicycleVehicle],
        ["Car / Van", record.carVan],
        ["Main Food Grain", record.mainFoodGrain],
      ],
    },
    {
      title: "GPS Location",
      fields: [
        ["Latitude", record.latitude],
        ["Longitude", record.longitude],
      ],
    },
    {
      title: "System Information",
      fields: [
        ["Submitted", formatDate(record.submittedAt)],
        ["Created", formatDate(record.createdAt)],
        ["Updated", formatDate(record.updatedAt)],
        ["Last Modified By", record.lastModifiedByEmail],
      ],
    },
  ];

  const mapUrl = hasGpsLocation
    ? `https://maps.google.com/maps?q=${latitude},${longitude}&z=18&t=k&output=embed`
    : "";
  const mapLink = hasGpsLocation
    ? `https://www.google.com/maps/@?api=1&map_action=map&center=${latitude},${longitude}&zoom=18&basemap=satellite`
    : "";

  return (
    <ModalShell title="Census Record Details" onClose={onClose} wide>
      <div className="max-h-[65vh] overflow-y-auto pr-1">
        <div className="space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="mb-3 border-b border-gray-200 pb-2 text-sm font-bold text-green-800">
                {section.title}
              </h3>
              <div className="grid grid-cols-1 gap-x-5 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                {section.fields.map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-gray-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      {label}
                    </p>
                    {label.includes("Mobile") ? (
                      <PhoneLink value={value} />
                    ) : (
                      <p className="mt-1 break-words text-sm font-semibold text-gray-700">
                        {value === null || value === undefined || value === ""
                          ? "—"
                          : String(value)}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              {section.title === "GPS Location" && hasGpsLocation && (
                <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  <iframe
                    title="Household location map"
                    src={mapUrl}
                    className="h-64 w-full border-0"
                    loading="lazy"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-3 py-2">
                    <span className="text-xs text-gray-500">
                      {latitude}, {longitude}
                    </span>
                    <a
                      href={mapLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-bold text-green-700 hover:text-green-800 hover:underline"
                    >
                      Open in Google Maps
                    </a>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-row-reverse gap-2 border-t border-gray-200 pt-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50"
        >
          Close
        </button>
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700"
        >
          Delete
        </button>
        <CensusPDFButton data={record} />
      </div>
    </ModalShell>
  );
}

function EditModal({ record, loading, onChange, onSave, onClose }) {
  return (
    <ModalShell title="Edit Census Record" onClose={onClose} wide>
      <div className="max-h-[68vh] overflow-y-auto pr-1">
        <div className="space-y-6">
          <EditSection title="Identification">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {/* <EditInput
                label="Household ID"
                name="householdId"
                value={record.householdId}
                onChange={onChange}
                readOnly
              /> */}
              <EditInput
                label="Building No."
                name="buildingNo"
                value={record.buildingNo}
                onChange={onChange}
              />
              <EditInput
                label="Census No."
                name="censusNo"
                value={record.censusNo}
                onChange={onChange}
              />
            </div>
          </EditSection>

          {/* <EditSection title="Enumerator">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EditInput
                label="Enumerator ID"
                name="enumeratorId"
                value={record.enumeratorId}
                onChange={onChange}
              />
              <EditInput
                label="Enumerator Name"
                name="enumeratorName"
                value={record.enumeratorName}
                onChange={onChange}
              />
              <EditInput
                label="Enumerator Mobile"
                name="enumeratorMobile"
                type="tel"
                value={record.enumeratorMobile}
                onChange={onChange}
              />
              <EditInput
                label="Enumerator Email"
                name="enumeratorEmail"
                value={record.enumeratorEmail}
                onChange={onChange}
                readOnly
              />
            </div>
          </EditSection>

          <EditSection title="Address">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <EditInput
                label="State"
                name="state"
                value={record.state}
                onChange={onChange}
              />
              <EditInput
                label="District"
                name="district"
                value={record.district}
                onChange={onChange}
              />
              <EditInput
                label="Subdivision"
                name="subdivision"
                value={record.subdivision}
                onChange={onChange}
              />
              <EditInput
                label="Block"
                name="block"
                value={record.block}
                onChange={onChange}
              />
              <EditInput
                label="Gram Panchayat"
                name="gramPanchayat"
                value={record.gramPanchayat}
                onChange={onChange}
              />
              <EditInput
                label="Ward"
                name="ward"
                value={record.ward}
                onChange={onChange}
              />
              <EditInput
                label="Village"
                name="village"
                value={record.village}
                onChange={onChange}
              />
              <EditInput
                label="Locality"
                name="locality"
                value={record.locality}
                onChange={onChange}
              />
              <EditInput
                label="PIN Code"
                name="pinCode"
                value={record.pinCode}
                onChange={onChange}
              />
            </div>
            <EditTextarea
              label="House Address"
              name="houseAddress"
              value={record.houseAddress}
              onChange={onChange}
            />
          </EditSection> */}

          <EditSection title="Household">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <EditInput
                label="Head Name"
                name="headName"
                value={record.headName}
                onChange={onChange}
              />
              <EditSelect
                label="Head Sex"
                name="headSex"
                value={record.headSex}
                onChange={onChange}
                options={editSelectOptions.headSex}
              />
              <EditInput
                label="Head Mobile"
                name="headMobile"
                type="tel"
                value={record.headMobile}
                onChange={onChange}
              />
              <EditSelect
                label="Self Enumeration"
                name="selfEnumeration"
                value={record.selfEnumeration}
                onChange={onChange}
                options={editSelectOptions.selfEnumeration}
              />
              {record.selfEnumeration === "হ্যাঁ" && (
                <EditInput
                  label="Self Enumeration ID"
                  name="selfEnumerationID"
                  value={record.selfEnumerationID}
                  onChange={onChange}
                  maxLength={12}
                />
              )}
              <EditInput
                label="পরিবার সংখ্যা"
                name="householdNo"
                type="number"
                min="0"
                value={record.householdNo}
                onChange={onChange}
              />

              <EditInput
                label="Total Members"
                name="householdMembers"
                type="number"
                min="0"
                value={record.householdMembers}
                onChange={onChange}
              />
              <EditInput
                label="বসবাসযোগ্য ঘরের সংখ্যা"
                name="roomCount"
                type="number"
                min="0"
                value={record.roomCount}
                onChange={onChange}
              />
              <EditInput
                label="Male Members"
                name="maleMembers"
                type="number"
                min="0"
                value={record.maleMembers}
                onChange={onChange}
              />
              <EditInput
                label="Female Members"
                name="femaleMembers"
                type="number"
                min="0"
                value={record.femaleMembers}
                onChange={onChange}
              />
              <EditInput
                label="Other Members"
                name="otherMembers"
                type="number"
                min="0"
                value={record.otherMembers}
                onChange={onChange}
              />
              <EditInput
                label="Married Couples"
                name="marriedCouples"
                type="number"
                min="0"
                value={record.marriedCouples}
                onChange={onChange}
              />
              <EditSelect
                label="Caste"
                name="caste"
                value={record.caste}
                onChange={onChange}
                options={editSelectOptions.caste}
              />
              <EditSelect
                label="House Ownership"
                name="houseOwnership"
                value={record.houseOwnership}
                onChange={onChange}
                options={editSelectOptions.houseOwnership}
              />
            </div>
          </EditSection>

          <EditSection title="House Information">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EditSelect
                label="Floor Material"
                name="floorMaterial"
                value={record.floorMaterial}
                onChange={onChange}
                options={editSelectOptions.floorMaterial}
              />
              <EditSelect
                label="Wall Material"
                name="wallMaterial"
                value={record.wallMaterial}
                onChange={onChange}
                options={editSelectOptions.wallMaterial}
              />
              <EditSelect
                label="Roof Material"
                name="roofMaterial"
                value={record.roofMaterial}
                onChange={onChange}
                options={editSelectOptions.roofMaterial}
              />
              <EditSelect
                label="House Use"
                name="houseUse"
                value={record.houseUse}
                onChange={onChange}
                options={editSelectOptions.houseUse}
              />
              <EditSelect
                label="House Condition"
                name="houseCondition"
                value={record.houseCondition}
                onChange={onChange}
                options={editSelectOptions.houseCondition}
              />
            </div>
          </EditSection>

          <EditSection title="Water & Sanitation">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EditSelect
                label="Drinking Water Source"
                name="drinkingWaterSource"
                value={record.drinkingWaterSource}
                onChange={onChange}
                options={editSelectOptions.drinkingWaterSource}
              />
              <EditSelect
                label="Drinking Water Location"
                name="drinkingWaterLocation"
                value={record.drinkingWaterLocation}
                onChange={onChange}
                options={editSelectOptions.drinkingWaterLocation}
              />
              <EditSelect
                label="Latrine Availability"
                name="latrineAvailability"
                value={record.latrineAvailability}
                onChange={onChange}
                options={editSelectOptions.latrineAvailability}
              />
              <EditSelect
                label="Latrine Type"
                name="latrineType"
                value={record.latrineType}
                onChange={onChange}
                options={editSelectOptions.latrineType}
              />
              <EditSelect
                label="Waste Water Drain"
                name="wasteWaterDrain"
                value={record.wasteWaterDrain}
                onChange={onChange}
                options={editSelectOptions.wasteWaterDrain}
              />
              <EditSelect
                label="Bathing Arrangement"
                name="bathingArrangement"
                value={record.bathingArrangement}
                onChange={onChange}
                options={editSelectOptions.bathingArrangement}
              />
            </div>
          </EditSection>

          <EditSection title="Lighting & Cooking">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EditSelect
                label="Lighting Source"
                name="lightingSource"
                value={record.lightingSource}
                onChange={onChange}
                options={editSelectOptions.lightingSource}
              />
              <EditSelect
                label="Cooking Gas"
                name="cookingGas"
                value={record.cookingGas}
                onChange={onChange}
                options={editSelectOptions.cookingGas}
              />
              <EditSelect
                label="Cooking Fuel"
                name="cookingFuel"
                value={record.cookingFuel}
                onChange={onChange}
                options={editSelectOptions.cookingFuel}
              />
            </div>
          </EditSection>

          <EditSection title="Technology & Assets">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EditSelect
                label="Radio"
                name="radio"
                value={record.radio}
                onChange={onChange}
                options={editSelectOptions.radio}
              />
              <EditSelect
                label="Television"
                name="television"
                value={record.television}
                onChange={onChange}
                options={editSelectOptions.television}
              />
              <EditSelect
                label="Internet"
                name="internet"
                value={record.internet}
                onChange={onChange}
                options={editSelectOptions.internet}
              />
              <EditSelect
                label="Laptop / Computer"
                name="laptopComputer"
                value={record.laptopComputer}
                onChange={onChange}
                options={editSelectOptions.laptopComputer}
              />
              <EditSelect
                label="Mobile Phone"
                name="mobilePhone"
                value={record.mobilePhone}
                onChange={onChange}
                options={editSelectOptions.mobilePhone}
              />
              <EditSelect
                label="Bicycle / Vehicle"
                name="bicycleVehicle"
                value={record.bicycleVehicle}
                onChange={onChange}
                options={editSelectOptions.bicycleVehicle}
              />
              <EditSelect
                label="Car / Van"
                name="carVan"
                value={record.carVan}
                onChange={onChange}
                options={editSelectOptions.carVan}
              />
              <EditSelect
                label="Main Food Grain"
                name="mainFoodGrain"
                value={record.mainFoodGrain}
                onChange={onChange}
                options={editSelectOptions.mainFoodGrain}
              />
            </div>
          </EditSection>

          <EditSection title="GPS Location">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EditInput
                label="Latitude"
                name="latitude"
                type="number"
                value={record.latitude}
                onChange={onChange}
              />
              <EditInput
                label="Longitude"
                name="longitude"
                type="number"
                value={record.longitude}
                onChange={onChange}
              />
            </div>
          </EditSection>

          <EditSection title="Record Status">
            <div className="max-w-sm">
              <label className="mb-1.5 block text-xs font-bold text-gray-600">
                Status
              </label>
              <select
                name="status"
                value={record.status || "submitted"}
                onChange={onChange}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
              >
                <option value="submitted">Submitted</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </EditSection>
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={loading}
          className="rounded-lg bg-green-700 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </ModalShell>
  );
}

function EditSection({ title, children }) {
  return (
    <section>
      <h3 className="mb-3 border-b border-green-100 pb-2 text-sm font-bold text-green-800">
        {title}
      </h3>
      {children}
    </section>
  );
}

function EditInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  readOnly = false,
  maxLength,
  min,
  pattern,
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-gray-600">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        readOnly={readOnly}
        maxLength={maxLength}
        min={min}
        pattern={pattern}
        className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition ${
          readOnly
            ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-500"
            : "border-gray-300 bg-white focus:border-green-600 focus:ring-2 focus:ring-green-100"
        }`}
      />
    </div>
  );
}

function EditSelect({ label, name, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-gray-600">
        {label}
      </label>
      <select
        name={name}
        value={value ?? ""}
        onChange={onChange}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
      >
        <option value="">-- নির্বাচন করুন --</option>
        {options.map((option, index) => (
          <option key={`${name}-${index}`} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}

function EditTextarea({ label, name, value, onChange }) {
  return (
    <div className="mt-4">
      <label className="mb-1.5 block text-xs font-bold text-gray-600">
        {label}
      </label>
      <textarea
        name={name}
        value={value ?? ""}
        onChange={onChange}
        rows={3}
        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
      />
    </div>
  );
}

function ModalShell({ title, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5">
      <div
        className={`relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${wide ? "max-w-6xl" : "max-w-lg"}`}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 bg-green-800 px-4 py-3 text-white sm:px-5">
          <h2 className="text-base font-bold sm:text-lg">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-white/10"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

function LoadingState({ label = "Census records loading..." }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-700" />
      <p className="mt-4 text-sm font-semibold text-gray-600">{label}</p>
    </div>
  );
}

function EmptyState({ hasRecords, onNew }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-14 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-3xl">
        {hasRecords ? "🔎" : "📋"}
      </div>

      <h2 className="mt-5 text-lg font-bold text-gray-800">
        {hasRecords ? "No matching records" : "No data yet"}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
        {hasRecords
          ? "আপনার search অথবা filter পরিবর্তন করে আবার চেষ্টা করুন।"
          : "প্রথম household-এর তথ্য সংগ্রহ করতে New Data Collection শুরু করুন।"}
      </p>

      {!hasRecords && (
        <button
          type="button"
          onClick={onNew}
          className="mt-6 rounded-xl bg-green-700 px-6 py-3 text-sm font-bold text-white shadow hover:bg-green-800"
        >
          + New Data Collection
        </button>
      )}
    </div>
  );
}
