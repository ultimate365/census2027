"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

export default function MyDataPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [records, setRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState("");

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

        setRecords(
          recordsSnapshot.docs
            .map((item) => ({ id: item.id, ...item.data() }))
            .sort(
              (first, second) =>
                (second.submittedAt?.toMillis?.() || 0) -
                (first.submittedAt?.toMillis?.() || 0),
            ),
        );
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

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();

    return records.filter((record) =>
      [
        record.householdId,
        record.censusNo,
        record.headName,
        record.village,
        record.locality,
        record.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [records, search]);

  const formatDate = (value) => {
    if (!value) return "—";
    const date =
      value.toDate?.() ||
      new Date(value.seconds ? value.seconds * 1000 : value);
    return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString("en-IN");
  };

  if (checkingAuth) return <LoadingState label="Checking authentication..." />;
  if (!user || !profile) return null;

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gray-100 px-3 py-5 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 overflow-hidden rounded-2xl bg-linear-to-r from-green-950 via-green-800 to-green-600 px-5 py-6 text-white shadow-lg sm:px-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-200">
            Enumerator
          </p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">My Data</h1>
          <p className="mt-1 text-sm text-green-100">
            আপনার submit করা {records.length}টি household record এখানে দেখুন।
          </p>
        </header>

        {error && <Notice type="error">{error}</Notice>}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-800">
                Submitted Records
              </h2>
              <p className="text-sm text-gray-500">
                শুধুমাত্র আপনার account দিয়ে entered data
              </p>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search household, name, village..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 sm:max-w-xs"
            />
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Loading your data...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">
              কোনো submitted data পাওয়া যায়নি।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-180 text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Household ID</th>
                    <th className="px-4 py-3">Head Name</th>
                    <th className="px-4 py-3">Village</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-green-50/50">
                      <td className="px-4 py-3 font-semibold text-gray-800">
                        {record.householdId || "—"}
                      </td>
                      <td className="px-4 py-3">{record.headName || "—"}</td>
                      <td className="px-4 py-3">{record.village || "—"}</td>
                      <td className="px-4 py-3">{record.status || "—"}</td>
                      <td className="px-4 py-3 text-gray-500">
                        {formatDate(record.submittedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(record)}
                          className="rounded-lg bg-green-700 px-3 py-2 text-xs font-bold text-white hover:bg-green-800"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {selectedRecord && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedRecord(null)}
          >
            <section
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-gray-200 pb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-green-700">
                    Household Record
                  </p>
                  <h2 className="mt-1 text-xl font-black text-gray-800">
                    {selectedRecord.householdId || "Record details"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecord(null)}
                  className="rounded-lg px-3 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100"
                >
                  Close
                </button>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {Object.entries(selectedRecord)
                  .filter(([key]) => key !== "id")
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="rounded-lg border border-gray-100 bg-gray-50 p-3"
                    >
                      <p className="text-xs font-semibold text-gray-500">
                        {key}
                      </p>
                      <p className="mt-1 wrap-break-word text-sm font-medium text-gray-800">
                        {typeof value === "object"
                          ? formatDate(value)
                          : String(value ?? "—")}
                      </p>
                    </div>
                  ))}
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

function LoadingState({ label }) {
  return (
    <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-green-700" />
        <p className="mt-4 text-sm font-semibold text-gray-600">{label}</p>
      </div>
    </main>
  );
}

function Notice({ children, type }) {
  return (
    <div
      className={`mb-5 rounded-lg border px-4 py-3 text-sm font-medium ${type === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}
    >
      {children}
    </div>
  );
}
