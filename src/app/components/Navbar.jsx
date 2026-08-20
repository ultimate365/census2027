"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";

export default function Navbar() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (!currentUser) {
        setIsAdmin(false);
        return;
      }

      try {
        const profileSnap = await getDoc(
          doc(db, "enumerators", currentUser.uid),
        );
        const profile = profileSnap.exists() ? profileSnap.data() : null;
        setIsAdmin(profile?.role === "admin" && profile?.status === "active");
      } catch (error) {
        console.error("Navbar profile loading error:", error);
        setIsAdmin(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      await signOut(auth);

      setMenuOpen(false);
    } catch (error) {
      console.error("Logout error:", error);
      alert("Logout করা যায়নি। আবার চেষ্টা করুন।");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-green-900/20 bg-green-900 text-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* LOGO */}
          <Link
            href="/"
            className="flex items-center gap-3"
            onClick={() => setMenuOpen(false)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-lg font-black text-green-800 shadow">
              C
            </div>

            <div className="hidden sm:block">
              <div className="text-base font-bold leading-tight">
                Census 2027
              </div>

              <div className="text-[10px] text-green-200">
                Household Data Collection
              </div>
            </div>
          </Link>

          {/* DESKTOP NAVIGATION */}
          <div className="hidden items-center gap-1 md:flex">
            <NavLink href="/">Home</NavLink>

            {user && (
              <>
                <NavLink href="/census-2027">Data Collection</NavLink>

                <NavLink href="/census-2027/my-data">My Data</NavLink>

                {isAdmin && (
                  <NavLink href="/census-2027/data">Manage Data</NavLink>
                )}

                {isAdmin && <NavLink href="/census-2027/users">Users</NavLink>}
              </>
            )}
          </div>

          {/* DESKTOP USER */}
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <div className="hidden text-right lg:block">
                  <p className="text-xs text-green-200">Signed in as</p>

                  <p className="max-w-45 truncate text-sm font-semibold">
                    {user.email}
                  </p>
                </div>

                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold transition hover:bg-white/20 disabled:opacity-50"
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                {/* <Link
                  href="/signup"
                  className="rounded-lg border border-white/30 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/20"
                >
                  Sign Up
                </Link> */}

                <Link
                  href="/login"
                  className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-green-800 shadow transition hover:bg-green-50"
                >
                  Login
                </Link>
              </div>
            )}
          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="rounded-lg p-2 hover:bg-white/10 md:hidden"
            aria-label="Toggle navigation menu"
          >
            <div className="space-y-1.5">
              <span
                className={`block h-0.5 w-6 bg-white transition ${
                  menuOpen ? "translate-y-2 rotate-45" : ""
                }`}
              />

              <span
                className={`block h-0.5 w-6 bg-white transition ${
                  menuOpen ? "opacity-0" : ""
                }`}
              />

              <span
                className={`block h-0.5 w-6 bg-white transition ${
                  menuOpen ? "-translate-y-2 -rotate-45" : ""
                }`}
              />
            </div>
          </button>
        </div>

        {/* MOBILE MENU */}
        {menuOpen && (
          <div className="border-t border-white/10 pb-4 pt-3 md:hidden">
            <div className="space-y-1">
              <MobileNavLink href="/" onClick={() => setMenuOpen(false)}>
                Home
              </MobileNavLink>

              {user && (
                <>
                  <MobileNavLink
                    href="/census-2027"
                    onClick={() => setMenuOpen(false)}
                  >
                    Data Collection
                  </MobileNavLink>

                  <MobileNavLink
                    href="/census-2027/my-data"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Data
                  </MobileNavLink>

                  {isAdmin && (
                    <MobileNavLink
                      href="/census-2027/data"
                      onClick={() => setMenuOpen(false)}
                    >
                      Manage Data
                    </MobileNavLink>
                  )}

                  {isAdmin && (
                    <MobileNavLink
                      href="/census-2027/users"
                      onClick={() => setMenuOpen(false)}
                    >
                      Users
                    </MobileNavLink>
                  )}
                </>
              )}
            </div>

            <div className="mt-3 border-t border-white/10 pt-3">
              {user ? (
                <>
                  <div className="mb-3 rounded-lg bg-white/10 p-3">
                    <p className="text-xs text-green-200">Signed in as</p>

                    <p className="mt-1 break-all text-sm font-semibold">
                      {user.email}
                    </p>
                  </div>

                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="w-full rounded-lg bg-white px-4 py-2.5 text-sm font-bold text-green-800 disabled:opacity-50"
                  >
                    {loggingOut ? "Logging out..." : "Logout"}
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {/* <Link
                    href="/signup"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg border border-white/30 bg-white/10 px-4 py-2.5 text-center text-sm font-bold text-white"
                  >
                    Sign Up
                  </Link> */}

                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="rounded-lg bg-white px-4 py-2.5 text-center text-sm font-bold text-green-800"
                  >
                    Login
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

/* Desktop navigation link */

function NavLink({ href, children }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 text-sm font-medium text-green-50 transition hover:bg-white/10 hover:text-white"
    >
      {children}
    </Link>
  );
}

/* Mobile navigation link */

function MobileNavLink({ href, children, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-green-50 hover:bg-white/10"
    >
      {children}
    </Link>
  );
}
