"use client";

import { useEffect, useMemo, useState } from "react";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

import { onAuthStateChanged } from "firebase/auth";

import { auth, db } from "@/lib/firebase";

import { useRouter } from "next/navigation";

/* =========================================================
   MAIN PAGE
========================================================= */

export default function CensusDataPage() {
  const router = useRouter();

  /* -------------------------------------------------------
     AUTH
  ------------------------------------------------------- */

  const [user, setUser] = useState(null);

  const [userProfile, setUserProfile] = useState(null);

  const [checkingAuth, setCheckingAuth] = useState(true);

  /* -------------------------------------------------------
     DATA
  ------------------------------------------------------- */

  const [records, setRecords] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  /* -------------------------------------------------------
     SEARCH / FILTER
  ------------------------------------------------------- */

  const [search, setSearch] = useState("");

  const [statusFilter, setStatusFilter] = useState("all");

  const [villageFilter, setVillageFilter] = useState("all");

  /* -------------------------------------------------------
     VIEW
  ------------------------------------------------------- */

  const [selectedRecord, setSelectedRecord] = useState(null);

  const [showDetails, setShowDetails] = useState(false);

  /* -------------------------------------------------------
     EDIT
  ------------------------------------------------------- */

  const [editingRecord, setEditingRecord] = useState(null);

  const [editLoading, setEditLoading] = useState(false);

  /* -------------------------------------------------------
     DELETE
  ------------------------------------------------------- */

  const [deletingId, setDeletingId] = useState(null);

  /* -------------------------------------------------------
     MESSAGE
  ------------------------------------------------------- */

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] = useState("");

  /* =======================================================
     AUTHENTICATION
  ======================================================= */

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        setUser(null);
        setCheckingAuth(false);
        router.replace("/");
        return;
      }

      setUser(currentUser);

      try {
        const profileRef = doc(db, "enumerators", currentUser.uid);

        const profileSnap = await getDoc(profileRef);

        if (profileSnap.exists()) {
          const profile = profileSnap.data();

          setUserProfile(profile);

          // Pending users should not
          // access this page.
          if (profile.status !== "active") {
            router.replace("/");
            return;
          }
        } else {
          setError("Enumerator profile পাওয়া যায়নি।");

          router.replace("/");
          return;
        }
      } catch (err) {
        console.error("Profile loading error:", err);

        setError("আপনার profile যাচাই করা যায়নি।");
      }

      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, [router]);

  /* =======================================================
     LOAD RECORDS
  ======================================================= */

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError("");

      const recordsRef = collection(db, "census2027");

      const q = query(recordsRef, orderBy("submittedAt", "desc"));

      const snapshot = await getDocs(q);

      const loadedRecords = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }));

      setRecords(loadedRecords);
    } catch (err) {
      console.error("Loading records error:", err);

      if (err.code === "permission-denied") {
        setError("আপনার Census records দেখার অনুমতি নেই।");
      } else if (err.code === "failed-precondition") {
        setError(
          "Firestore index প্রয়োজন। Firebase Console-এ দেখানো index তৈরি করুন।",
        );
      } else {
        setError(err.message || "Census records load করা যায়নি।");
      }
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     VILLAGE LIST
  ======================================================= */

  const villages = useMemo(() => {
    const values = records.map((record) => record.village).filter(Boolean);

    return [...new Set(values)].sort((a, b) =>
      String(a).localeCompare(String(b)),
    );
  }, [records]);

  /* =======================================================
     FILTERED RECORDS
  ======================================================= */

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
        record.selfEnumerationID,
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

  /* =======================================================
     DATE FORMAT
  ======================================================= */

  const formatDate = (value) => {
    if (!value) {
      return "—";
    }

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

  /* =======================================================
     VIEW RECORD
  ======================================================= */

  const handleView = (record) => {
    setSelectedRecord(record);

    setShowDetails(true);
  };

  /* =======================================================
     EDIT RECORD
  ======================================================= */

  const handleEdit = (record) => {
    setEditingRecord({
      ...record,
    });

    setMessage("");
    setMessageType("");
  };

  /* =======================================================
     HANDLE EDIT INPUT
  ======================================================= */

  const handleEditChange = (e) => {
    const { name, value } = e.target;

    let nextValue = value;

    if (name === "selfEnumeration") {
      nextValue = value;
      setEditingRecord((prev) => ({
        ...prev,
        selfEnumeration: nextValue,
        selfEnumerationID:
          value !== "হ্যাঁ" ? "" : prev.selfEnumerationID || "",
      }));
      return;
    }

    if (name === "selfEnumerationNumber") {
      nextValue = value
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 12)
        .toUpperCase();
    }

    setEditingRecord((prev) => ({
      ...prev,
      [name]: nextValue,
    }));
  };

  /* =======================================================
     SAVE EDIT
  ======================================================= */

  const handleSaveEdit = async () => {
    if (!editingRecord || !editingRecord.id) {
      return;
    }

    setEditLoading(true);
    setMessage("");

    try {
      const recordRef = doc(db, "census2027", editingRecord.id);

      /*
       * Do not send the local Firestore
       * document ID as a field.
       */
      const dataToSave = { ...editingRecord };

      delete dataToSave.id;

      if (dataToSave.selfEnumeration === "হ্যাঁ") {
        if (!/^[A-Z0-9]{12}$/.test(dataToSave.selfEnumerationID || "")) {
          setMessage(
            "Self Enumeration ID অবশ্যই ১২ অক্ষরের Capital Alpha Numeric Code হতে হবে।",
          );

          setMessageType("error");

          setEditLoading(false);

          return;
        }
      }

      /*
       * Convert numeric values.
       */
      const numericFields = [
        "householdMembers",
        "maleMembers",
        "femaleMembers",
        "otherMembers",
        "marriedCouples",
        "latitude",
        "longitude",
      ];

      numericFields.forEach((field) => {
        if (field in dataToSave) {
          if (
            dataToSave[field] === "" ||
            dataToSave[field] === null ||
            dataToSave[field] === undefined
          ) {
            dataToSave[field] = null;
          } else {
            const number = Number(dataToSave[field]);

            dataToSave[field] = Number.isNaN(number) ? null : number;
          }
        }
      });

      await updateDoc(recordRef, {
        ...dataToSave,

        updatedAt: serverTimestamp(),

        lastModifiedBy: user.uid,

        lastModifiedByEmail: user.email || "",
      });

      setMessage("Census record সফলভাবে update হয়েছে।");

      setMessageType("success");

      setEditingRecord(null);

      await loadRecords();
    } catch (err) {
      console.error("Update error:", err);

      if (err.code === "permission-denied") {
        setMessage("এই record update করার অনুমতি আপনার নেই।");
      } else {
        setMessage(err.message || "Record update করা যায়নি।");
      }

      setMessageType("error");
    } finally {
      setEditLoading(false);
    }
  };

  /* =======================================================
     DELETE RECORD
  ======================================================= */

  const handleDelete = async (record) => {
    if (userProfile?.role !== "admin") {
      setMessage("শুধুমাত্র Administrator record delete করতে পারবেন।");

      setMessageType("error");

      return;
    }

    const confirmed = window.confirm(
      `আপনি কি নিশ্চিত যে এই Census record টি permanently delete করতে চান?\n\nHousehold ID: ${
        record.householdId || "—"
      }\nHead Name: ${record.headName || "—"}\n\nএই কাজটি Undo করা যাবে না।`,
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(record.id);

      const recordRef = doc(db, "census2027", record.id);

      await deleteDoc(recordRef);

      setRecords((prev) => prev.filter((item) => item.id !== record.id));

      if (selectedRecord?.id === record.id) {
        setSelectedRecord(null);

        setShowDetails(false);
      }

      setMessage("Record সফলভাবে delete হয়েছে।");

      setMessageType("success");
    } catch (err) {
      console.error("Delete error:", err);

      if (err.code === "permission-denied") {
        setMessage("Record delete করার অনুমতি নেই।");
      } else {
        setMessage(err.message || "Record delete করা যায়নি।");
      }

      setMessageType("error");
    } finally {
      setDeletingId(null);
    }
  };

  /* =======================================================
     CLOSE DETAILS
  ======================================================= */

  const closeDetails = () => {
    setShowDetails(false);

    setSelectedRecord(null);
  };

  /* =======================================================
     CLOSE EDIT
  ======================================================= */

  const closeEdit = () => {
    if (editLoading) {
      return;
    }

    setEditingRecord(null);
  };

  /* =======================================================
     AUTH LOADING
  ======================================================= */

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

  /* =======================================================
     MAIN
  ======================================================= */

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gray-100 px-3 py-5 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-green-950 via-green-800 to-green-600 text-white shadow-lg">
          <div className="flex flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-green-200">
                Census 2027
              </div>

              <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                Household Data
              </h1>

              <p className="mt-1 text-sm text-green-100">
                View, search and manage collected records
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => router.push("/census-2027")}
                className="rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-green-800 shadow transition hover:bg-green-50"
              >
                + New Data
              </button>

              <button
                type="button"
                onClick={loadRecords}
                disabled={loading}
                className="rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-white/20 disabled:opacity-50"
              >
                {loading ? "Loading..." : "↻ Refresh"}
              </button>
            </div>
          </div>
        </div>

        {/* =================================================
            USER / ROLE
        ================================================= */}

        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Total Records" value={records.length} icon="📋" />

          <StatCard
            label="Filtered Records"
            value={filteredRecords.length}
            icon="🔎"
          />

          <StatCard
            label="Access Level"
            value={
              userProfile?.role === "admin" ? "Administrator" : "Enumerator"
            }
            icon={userProfile?.role === "admin" ? "🛡️" : "👤"}
          />
        </div>

        {/* =================================================
            MESSAGE
        ================================================= */}

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

        {/* =================================================
            ERROR
        ================================================= */}

        {error && (
          <div className="mb-5 rounded-xl border border-red-300 bg-red-50 px-4 py-4 text-sm text-red-800">
            <p className="font-bold">Error</p>

            <p className="mt-1">{error}</p>

            <button
              type="button"
              onClick={loadRecords}
              className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-xs font-bold text-white hover:bg-red-800"
            >
              Try Again
            </button>
          </div>
        )}

        {/* =================================================
            SEARCH / FILTER
        ================================================= */}

        <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4">
            <h2 className="font-bold text-gray-800">Search & Filter</h2>

            <p className="mt-1 text-xs text-gray-500">
              Search using Household ID, Census No., Building No., Head Name,
              Village or Enumerator details.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {/* SEARCH */}

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

            {/* STATUS */}

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

            {/* VILLAGE */}

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

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <LoadingState />
        ) : filteredRecords.length === 0 ? (
          <EmptyState
            hasRecords={records.length > 0}
            onNew={() => router.push("/census-2027")}
          />
        ) : (
          <>
            {/* DESKTOP TABLE */}

            <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:block">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-3">Household</th>

                      <th className="px-4 py-3">Building / Census</th>

                      <th className="px-4 py-3">Head of Household</th>

                      <th className="px-4 py-3">Location</th>

                      <th className="px-4 py-3">Members</th>

                      <th className="px-4 py-3">Enumerator</th>

                      <th className="px-4 py-3">Submitted</th>

                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRecords.map((record) => (
                      <RecordRow
                        key={record.id}
                        record={record}
                        isAdmin={userProfile?.role === "admin"}
                        deletingId={deletingId}
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

            {/* MOBILE / TABLET CARDS */}

            <div className="grid grid-cols-1 gap-4 lg:hidden">
              {filteredRecords.map((record) => (
                <RecordCard
                  key={record.id}
                  record={record}
                  isAdmin={userProfile?.role === "admin"}
                  deletingId={deletingId}
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

      {/* ===================================================
          DETAILS MODAL
      =================================================== */}

      {showDetails && selectedRecord && (
        <DetailsModal
          record={selectedRecord}
          isAdmin={userProfile?.role === "admin"}
          onClose={closeDetails}
          onEdit={() => {
            setShowDetails(false);

            handleEdit(selectedRecord);
          }}
          onDelete={() => {
            setShowDetails(false);

            handleDelete(selectedRecord);
          }}
          deleting={deletingId === selectedRecord.id}
          formatDate={formatDate}
        />
      )}

      {/* ===================================================
          EDIT MODAL
      =================================================== */}

      {editingRecord && (
        <EditModal
          record={editingRecord}
          loading={editLoading}
          onChange={handleEditChange}
          onSave={handleSaveEdit}
          onClose={closeEdit}
        />
      )}
    </main>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

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

/* =========================================================
   TABLE ROW
========================================================= */

function RecordRow({
  record,
  isAdmin,
  deletingId,
  onView,
  onEdit,
  onDelete,
  formatDate,
}) {
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

        {record.headMobile && (
          <p className="mt-0.5 text-xs text-gray-500">{record.headMobile}</p>
        )}
      </td>

      <td className="px-4 py-4">
        <p className="text-sm text-gray-700">{record.village || "—"}</p>

        <p className="mt-0.5 text-xs text-gray-500">{record.district || ""}</p>
      </td>

      <td className="px-4 py-4">
        <p className="text-sm font-bold text-gray-800">
          {record.householdMembers ?? "—"}
        </p>

        <p className="mt-0.5 text-xs text-gray-500">
          M: {record.maleMembers ?? 0} F: {record.femaleMembers ?? 0} O:{" "}
          {record.otherMembers ?? 0}
        </p>
      </td>

      <td className="px-4 py-4">
        <p className="text-sm text-gray-700">{record.enumeratorName || "—"}</p>

        <p className="mt-0.5 text-xs text-gray-500">
          {record.enumeratorId || ""}
        </p>
      </td>

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

          {isAdmin && (
            <button
              type="button"
              onClick={() => onDelete(record)}
              disabled={deletingId === record.id}
              title="Delete"
              className="rounded-lg bg-red-600 px-2.5 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deletingId === record.id ? "..." : "Delete"}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* =========================================================
   MOBILE CARD
========================================================= */

function RecordCard({
  record,
  isAdmin,
  deletingId,
  onView,
  onEdit,
  onDelete,
  formatDate,
}) {
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

          <MiniInfo label="Members" value={record.householdMembers} />

          <MiniInfo label="Building No." value={record.buildingNo} />

          <MiniInfo label="Census No." value={record.censusNo} />

          <MiniInfo label="Village" value={record.village} />

          <MiniInfo label="Enumerator" value={record.enumeratorId} />
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

          {isAdmin && (
            <button
              type="button"
              onClick={() => onDelete(record)}
              disabled={deletingId === record.id}
              className="flex-1 rounded-lg bg-red-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deletingId === record.id ? "..." : "Delete"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   MINI INFO
========================================================= */

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

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({ status }) {
  const normalized = status || "unknown";

  let classes = "bg-gray-100 text-gray-600";

  if (normalized === "submitted") {
    classes = "bg-blue-100 text-blue-700";
  }

  if (normalized === "verified") {
    classes = "bg-green-100 text-green-700";
  }

  if (normalized === "pending") {
    classes = "bg-yellow-100 text-yellow-700";
  }

  return (
    <span
      className={`mt-1 inline-flex rounded-full px-2 py-1 text-[10px] font-bold uppercase ${classes}`}
    >
      {normalized}
    </span>
  );
}

/* =========================================================
   DETAILS MODAL
========================================================= */

function DetailsModal({
  record,
  isAdmin,
  onClose,
  onEdit,
  onDelete,
  deleting,
  formatDate,
}) {
  const sections = [
    {
      title: "Identification",
      fields: [
        ["Household ID", record.householdId],
        ["Survey Year", record.surveyYear],
        ["Status", record.status],
        ["Building No.", record.buildingNo],
        ["Census No.", record.censusNo],
      ],
    },

    {
      title: "Enumerator",
      fields: [
        ["Enumerator ID", record.enumeratorId],
        ["Enumerator Name", record.enumeratorName],
        ["Enumerator Mobile", record.enumeratorMobile],
        ["Enumerator Email", record.enumeratorEmail],
        ["Enumerator UID", record.enumeratorUid],
      ],
    },

    {
      title: "Administrative Information",
      fields: [
        ["State", record.state],
        ["District", record.district],
        ["Subdivision", record.subdivision],
        ["Block", record.block],
        ["Gram Panchayat", record.gramPanchayat],
        ["Ward", record.ward],
        ["Village", record.village],
        ["Locality", record.locality],
        ["PIN Code", record.pinCode],
        ["House Address", record.houseAddress],
      ],
    },

    {
      title: "Household",
      fields: [
        ["Head Name", record.headName],
        ["Head Mobile", record.headMobile],
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

                    <p className="mt-1 break-words text-sm font-semibold text-gray-700">
                      {value === null || value === undefined || value === ""
                        ? "—"
                        : String(value)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-gray-200 pt-4 sm:flex-row sm:justify-end">
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
          Edit Record
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Record"}
          </button>
        )}
      </div>
    </ModalShell>
  );
}

/* =========================================================
   EDIT MODAL
========================================================= */

function EditModal({ record, loading, onChange, onSave, onClose }) {
  return (
    <ModalShell title="Edit Census Record" onClose={onClose} wide>
      <div className="max-h-[68vh] overflow-y-auto pr-1">
        <div className="space-y-6">
          {/* IDENTIFICATION */}

          <EditSection title="Identification">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <EditInput
                label="Household ID"
                name="householdId"
                value={record.householdId}
                onChange={onChange}
                readOnly
              />

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

          {/* ENUMERATOR */}

          <EditSection title="Enumerator">
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

          {/* ADDRESS */}

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
          </EditSection>

          {/* HOUSEHOLD */}

          <EditSection title="Household">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <EditInput
                label="Head Name"
                name="headName"
                value={record.headName}
                onChange={onChange}
              />

              <EditInput
                label="Head Mobile"
                name="headMobile"
                value={record.headMobile}
                onChange={onChange}
              />

              <EditInput
                label="Self Enumeration"
                name="selfEnumeration"
                value={record.selfEnumeration}
                onChange={onChange}
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
                label="Total Members"
                name="householdMembers"
                type="number"
                value={record.householdMembers}
                onChange={onChange}
              />

              <EditInput
                label="Male Members"
                name="maleMembers"
                type="number"
                value={record.maleMembers}
                onChange={onChange}
              />

              <EditInput
                label="Female Members"
                name="femaleMembers"
                type="number"
                value={record.femaleMembers}
                onChange={onChange}
              />

              <EditInput
                label="Other Members"
                name="otherMembers"
                type="number"
                value={record.otherMembers}
                onChange={onChange}
              />

              <EditInput
                label="Married Couples"
                name="marriedCouples"
                type="number"
                value={record.marriedCouples}
                onChange={onChange}
              />

              <EditInput
                label="Caste"
                name="caste"
                value={record.caste}
                onChange={onChange}
              />

              <EditInput
                label="House Ownership"
                name="houseOwnership"
                value={record.houseOwnership}
                onChange={onChange}
              />
            </div>
          </EditSection>

          {/* HOUSE */}

          <EditSection title="House Information">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EditInput
                label="Floor Material"
                name="floorMaterial"
                value={record.floorMaterial}
                onChange={onChange}
              />

              <EditInput
                label="Wall Material"
                name="wallMaterial"
                value={record.wallMaterial}
                onChange={onChange}
              />

              <EditInput
                label="Roof Material"
                name="roofMaterial"
                value={record.roofMaterial}
                onChange={onChange}
              />

              <EditInput
                label="House Use"
                name="houseUse"
                value={record.houseUse}
                onChange={onChange}
              />

              <EditInput
                label="House Condition"
                name="houseCondition"
                value={record.houseCondition}
                onChange={onChange}
              />
            </div>
          </EditSection>

          {/* WATER / SANITATION */}

          <EditSection title="Water & Sanitation">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EditInput
                label="Drinking Water Source"
                name="drinkingWaterSource"
                value={record.drinkingWaterSource}
                onChange={onChange}
              />

              <EditInput
                label="Drinking Water Location"
                name="drinkingWaterLocation"
                value={record.drinkingWaterLocation}
                onChange={onChange}
              />

              <EditInput
                label="Latrine Availability"
                name="latrineAvailability"
                value={record.latrineAvailability}
                onChange={onChange}
              />

              <EditInput
                label="Latrine Type"
                name="latrineType"
                value={record.latrineType}
                onChange={onChange}
              />

              <EditInput
                label="Waste Water Drain"
                name="wasteWaterDrain"
                value={record.wasteWaterDrain}
                onChange={onChange}
              />

              <EditInput
                label="Bathing Arrangement"
                name="bathingArrangement"
                value={record.bathingArrangement}
                onChange={onChange}
              />
            </div>
          </EditSection>

          {/* COOKING */}

          <EditSection title="Lighting & Cooking">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EditInput
                label="Lighting Source"
                name="lightingSource"
                value={record.lightingSource}
                onChange={onChange}
              />

              <EditInput
                label="Cooking Gas"
                name="cookingGas"
                value={record.cookingGas}
                onChange={onChange}
              />

              <EditInput
                label="Cooking Fuel"
                name="cookingFuel"
                value={record.cookingFuel}
                onChange={onChange}
              />
            </div>
          </EditSection>

          {/* ASSETS */}

          <EditSection title="Technology & Assets">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <EditInput
                label="Radio"
                name="radio"
                value={record.radio}
                onChange={onChange}
              />

              <EditInput
                label="Television"
                name="television"
                value={record.television}
                onChange={onChange}
              />

              <EditInput
                label="Internet"
                name="internet"
                value={record.internet}
                onChange={onChange}
              />

              <EditInput
                label="Laptop / Computer"
                name="laptopComputer"
                value={record.laptopComputer}
                onChange={onChange}
              />

              <EditInput
                label="Mobile Phone"
                name="mobilePhone"
                value={record.mobilePhone}
                onChange={onChange}
              />

              <EditInput
                label="Bicycle / Vehicle"
                name="bicycleVehicle"
                value={record.bicycleVehicle}
                onChange={onChange}
              />

              <EditInput
                label="Car / Van"
                name="carVan"
                value={record.carVan}
                onChange={onChange}
              />

              <EditInput
                label="Main Food Grain"
                name="mainFoodGrain"
                value={record.mainFoodGrain}
                onChange={onChange}
              />
            </div>
          </EditSection>

          {/* GPS */}

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

          {/* STATUS */}

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

      {/* ACTIONS */}

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

/* =========================================================
   EDIT SECTION
========================================================= */

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

/* =========================================================
   EDIT INPUT
========================================================= */

function EditInput({
  label,
  name,
  value,
  onChange,
  type = "text",
  readOnly = false,
  maxLength,
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

/* =========================================================
   EDIT TEXTAREA
========================================================= */

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

/* =========================================================
   MODAL SHELL
========================================================= */

function ModalShell({ title, children, onClose, wide = false }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-5">
      <div
        className={`relative flex max-h-[94vh] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${
          wide ? "max-w-6xl" : "max-w-lg"
        }`}
      >
        {/* HEADER */}

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

        {/* BODY */}

        <div className="min-h-0 flex-1 p-4 sm:p-5">{children}</div>
      </div>
    </div>
  );
}

/* =========================================================
   LOADING STATE
========================================================= */

function LoadingState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
      <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-700" />

      <p className="mt-4 text-sm font-semibold text-gray-600">
        Census records loading...
      </p>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({ hasRecords, onNew }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 py-14 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-3xl">
        {hasRecords ? "🔎" : "📋"}
      </div>

      <h2 className="mt-5 text-lg font-bold text-gray-800">
        {hasRecords ? "No matching records" : "No Census records yet"}
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
