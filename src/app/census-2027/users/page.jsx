"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { useRouter } from "next/navigation";

import { auth, db } from "@/lib/firebase";

export default function UserManagementPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [profile, setProfile] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingUid, setSavingUid] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [message, setMessage] = useState("");
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

        if (
          currentProfile?.role !== "admin" ||
          currentProfile.status !== "active"
        ) {
          router.replace("/census-2027/data");
          return;
        }

        setProfile(currentProfile);
        const snapshot = await getDocs(collection(db, "enumerators"));
        setUsers(
          snapshot.docs
            .map((item) => ({ uid: item.id, ...item.data() }))
            .sort((a, b) =>
              String(a.name || a.email || "").localeCompare(
                String(b.name || b.email || ""),
              ),
            ),
        );
      } catch (loadError) {
        console.error("User management loading error:", loadError);
        setError(loadError.message || "Registered users load করা যায়নি।");
      } finally {
        setCheckingAuth(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch = [
        user.name,
        user.email,
        user.enumeratorId,
        user.mobile,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term);
      const matchesStatus =
        statusFilter === "all" || (user.status || "pending") === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, users]);

  const updateUser = async (user, changes) => {
    if (
      user.uid === auth.currentUser?.uid &&
      (changes.status === "suspended" ||
        changes.status === "pending" ||
        changes.role === "enumerator")
    ) {
      setError("নিজের administrator account deactivate বা demote করা যাবে না।");
      return;
    }

    try {
      setSavingUid(user.uid);
      setError("");
      await updateDoc(doc(db, "enumerators", user.uid), {
        ...changes,
        updatedAt: serverTimestamp(),
      });
      setUsers((currentUsers) =>
        currentUsers.map((item) =>
          item.uid === user.uid ? { ...item, ...changes } : item,
        ),
      );
      setMessage("User profile সফলভাবে update হয়েছে।");
    } catch (updateError) {
      console.error("User update error:", updateError);
      setError(updateError.message || "User profile update করা যায়নি।");
    } finally {
      setSavingUid(null);
    }
  };

  const deleteUserProfile = async (user) => {
    if (user.uid === auth.currentUser?.uid) {
      setError("নিজের administrator profile delete করা যাবে না।");
      return;
    }

    if (
      !window.confirm(
        `${user.name || user.email || "এই user"}-এর profile delete করবেন?`,
      )
    )
      return;

    try {
      setSavingUid(user.uid);
      setError("");
      await deleteDoc(doc(db, "enumerators", user.uid));
      setUsers((currentUsers) =>
        currentUsers.filter((item) => item.uid !== user.uid),
      );
      setMessage(
        "User profile delete হয়েছে। Firebase Authentication account আলাদাভাবে delete করতে হবে।",
      );
    } catch (deleteError) {
      console.error("User delete error:", deleteError);
      setError(deleteError.message || "User profile delete করা যায়নি।");
    } finally {
      setSavingUid(null);
    }
  };

  if (checkingAuth) {
    return <LoadingState label="Checking administrator access..." />;
  }

  if (!profile) return null;

  return (
    <main className="min-h-[calc(100vh-64px)] bg-linear-to-br from-green-50 via-white to-emerald-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 rounded-2xl bg-green-900 px-5 py-6 text-white shadow-lg sm:px-7">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-200">
                Administrator
              </p>
              <h1 className="mt-2 text-2xl font-black sm:text-3xl">
                Registered Users
              </h1>
              <p className="mt-1 text-sm text-green-100">
                Review accounts and control access to Census 2027.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/census-2027/data")}
              className="rounded-lg border border-white/30 px-4 py-2.5 text-sm font-bold hover:bg-white/10"
            >
              Back to data
            </button>
          </div>
        </header>

        {message && (
          <Notice
            type="success"
            message={message}
            onClose={() => setMessage("")}
          />
        )}
        {error && (
          <Notice type="error" message={error} onClose={() => setError("")} />
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="mb-5 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, email, ID or mobile"
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-green-600"
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <div className="rounded-lg bg-green-50 px-4 py-2.5 text-sm font-bold text-green-800">
              {filteredUsers.length} of {users.length} users
            </div>
          </div>

          {loading ? (
            <LoadingState label="Loading registered users..." />
          ) : filteredUsers.length === 0 ? (
            <p className="rounded-lg bg-gray-50 px-4 py-10 text-center text-sm text-gray-500">
              No registered users match this filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-190 text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                    <th className="px-3 py-3">User</th>
                    <th className="px-3 py-3">Enumerator ID</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <UserRow
                      key={user.uid}
                      user={user}
                      saving={savingUid === user.uid}
                      onUpdate={updateUser}
                      onDelete={deleteUserProfile}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function UserRow({ user, saving, onUpdate, onDelete }) {
  const status = user.status || "pending";
  return (
    <tr className="align-middle hover:bg-green-50/50">
      <td className="px-3 py-4">
        <p className="font-bold text-gray-800">{user.name || "Unnamed user"}</p>
        <p className="mt-1 text-xs text-gray-500">{user.email || "No email"}</p>
        <p className="mt-1 text-xs text-gray-500">
          {user.mobile || "No mobile"}
        </p>
      </td>
      <td className="px-3 py-4 text-gray-700">{user.enumeratorId || "—"}</td>
      <td className="px-3 py-4">
        <select
          value={user.role || "enumerator"}
          disabled={saving}
          onChange={(event) => onUpdate(user, { role: event.target.value })}
          className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
        >
          <option value="enumerator">Enumerator</option>
          <option value="admin">Administrator</option>
        </select>
      </td>
      <td className="px-3 py-4">
        <span
          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status === "active" ? "bg-green-100 text-green-800" : status === "suspended" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}
        >
          {status}
        </span>
      </td>
      <td className="px-3 py-4">
        <div className="flex justify-end gap-2">
          <select
            value={status}
            disabled={saving}
            onChange={(event) => onUpdate(user, { status: event.target.value })}
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
          <button
            type="button"
            disabled={saving}
            onClick={() => onDelete(user)}
            className="rounded-md border border-red-200 px-2.5 py-1.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

function Notice({ type, message, onClose }) {
  return (
    <div
      className={`mb-4 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm font-semibold ${type === "success" ? "border-green-300 bg-green-50 text-green-800" : "border-red-300 bg-red-50 text-red-800"}`}
    >
      <span>{message}</span>
      <button type="button" onClick={onClose} aria-label="Dismiss message">
        ×
      </button>
    </div>
  );
}

function LoadingState({ label }) {
  return (
    <div className="flex min-h-40 items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-gray-200 border-t-green-700" />
        <p className="mt-3 text-sm font-semibold text-gray-600">{label}</p>
      </div>
    </div>
  );
}
