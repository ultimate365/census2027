"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const getEnumeratorProfileStorageKey = (uid) =>
  `census2027:enumerator-profile:${uid}`;

const readCachedEnumeratorProfile = (uid) => {
  if (typeof window === "undefined" || !uid) return null;

  try {
    const cachedProfile = window.localStorage.getItem(
      getEnumeratorProfileStorageKey(uid),
    );

    return cachedProfile ? JSON.parse(cachedProfile) : null;
  } catch (error) {
    console.error("Cached enumerator profile read error:", error);
    return null;
  }
};

const cacheEnumeratorProfile = (uid, profile) => {
  if (typeof window === "undefined" || !uid || !profile) return;

  try {
    window.localStorage.setItem(
      getEnumeratorProfileStorageKey(uid),
      JSON.stringify(profile),
    );
  } catch (error) {
    console.error("Enumerator profile cache error:", error);
  }
};

const Input = ({
  label,
  name,
  form,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  min,
  max,
  readOnly = false,
}) => (
  <div>
    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>

    <input
      type={type}
      name={name}
      value={form[name] ?? ""}
      onChange={onChange}
      required={required}
      placeholder={placeholder}
      min={min}
      max={max}
      readOnly={readOnly}
      autoCapitalize="characters"
      style={{
        textTransform:
          type !== "number" && type !== "tel" ? "uppercase" : "none",
      }}
      className={`w-full rounded-lg border px-3 py-2.5 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100 ${
        readOnly
          ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-600"
          : "border-gray-300 bg-white"
      }`}
    />
  </div>
);

const Select = ({ label, name, form, onChange, options, required = false }) => (
  <div>
    <label className="mb-1.5 block text-sm font-semibold text-gray-700">
      {label}
      {required && <span className="ml-1 text-red-500">*</span>}
    </label>

    <select
      name={name}
      value={form[name] ?? ""}
      onChange={onChange}
      required={required}
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

const Section = ({ number, title, children }) => (
  <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
    <div className="flex items-center gap-3 border-b border-green-100 bg-green-50 px-4 py-3 sm:px-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-700 text-sm font-bold text-white">
        {number}
      </span>

      <h2 className="text-base font-bold text-gray-800 sm:text-lg">{title}</h2>
    </div>

    <div className="p-4 sm:p-5">{children}</div>
  </section>
);

export default function Census2027Page() {
  const router = useRouter();

  // =====================================================
  // INITIAL FORM
  // =====================================================

  const initialForm = {
    // Survey
    householdId: "",
    enumeratorId: "ev_2018002_skmaidulis",
    enumeratorName: "SK MAIDUL ISLAM",
    enumeratorMobile: "9933684468",

    // Address
    state: "West Bengal",
    district: "HOWRAH",
    subdivision: "ULUBERIA",
    block: "AMTA-II",
    gramPanchayat: "THALIA",
    ward: "",
    village: "SEHAGORI",
    locality: "",
    houseAddress: "SEHAGORI, THALIA, AMTA-II, HOWRAH, WEST BENGAL",
    pinCode: "711401",

    // GPS
    latitude: "",
    longitude: "",

    // Census
    buildingNo: "CN",
    censusNo: "",
    headName: "",
    headMobile: "",
    selfEnumeration: "না",
    selfEnumerationID: "",

    // House
    floorMaterial: "সিমেন্ট",
    wallMaterial: "পোড়া ইট",
    roofMaterial: "কংক্রিট",
    houseUse: "বাসগৃহ",
    houseCondition: "ভালো",

    // Household
    householdMembers: "",
    roomCount: "",
    maleMembers: "",
    femaleMembers: "",
    otherMembers: "",
    caste: "অন্যান্য",
    houseOwnership: "নিজের",
    marriedCouples: "",

    // Water
    drinkingWaterSource: "পরিশুদ্ধ কলের জল",
    drinkingWaterLocation: "বাড়ির চৌহদ্দির মধ্যে",

    // Lighting
    lightingSource: "বিদ্যুৎ",

    // Sanitation
    latrineAvailability: "শুধু এই পরিবারের",
    latrineType: "দুটি কুয়ো/পিটযুক্ত",
    wasteWaterDrain: "কোন নর্দমা নেই",
    bathingArrangement: "স্নানের ঘর আছে",

    // Cooking
    cookingGas: "সংযোগ আছে",
    cookingFuel: "রান্নার গ্যাস (LPG/CNG)",

    // Technology / Assets
    radio: "মোবাইল/স্মার্টফোন",
    television: "কেবল সংযোগ",
    internet: "মোবাইল ডেটা",
    laptopComputer: "না",
    mobilePhone: "স্মার্টফোন",
    bicycleVehicle: "",
    carVan: "না",

    // Food
    mainFoodGrain: "ধান",
  };

  const [form, setForm] = useState(initialForm);

  // =====================================================
  // AUTH
  // =====================================================

  const [user, setUser] = useState(null);

  const [userProfile, setUserProfile] = useState(null);

  const [checkingAuth, setCheckingAuth] = useState(true);

  // =====================================================
  // SUBMISSION
  // =====================================================

  const [loading, setLoading] = useState(false);

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] = useState("");

  const optionalHouseUseValues = [
    "দোকান/অফিস",
    "স্কুল/কলেজ",
    "হোটেল/নিবাস/অতিথিশালা",
    "হাসপাতাল/স্বাস্থ্যকেন্দ্র",
    "কারখানা/ওয়ার্কশপ",
    "ধর্মীয় স্থান",
    "বাসগৃহ ছাড়া অন্য ব্যবহার",
    "খালি",
  ];

  const isOptionalHouseUse = optionalHouseUseValues.includes(form.houseUse);
  const requiredForHousehold = !isOptionalHouseUse;

  // =====================================================
  // HOUSEHOLD ID
  // =====================================================

  const generateHouseholdId = () => {
    const now = new Date();

    const datePart =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0");

    const timePart =
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();

    return `C27-${datePart}-${timePart}-${randomPart}`;
  };

  // =====================================================
  // AUTHENTICATION + PROFILE CHECK
  // =====================================================

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!mounted) return;

      // ---------------------------------------------
      // NOT LOGGED IN
      // ---------------------------------------------

      if (!currentUser) {
        setUser(null);
        setUserProfile(null);
        setCheckingAuth(false);

        router.replace("/");

        return;
      }

      try {
        setCheckingAuth(true);

        const cachedProfile = readCachedEnumeratorProfile(currentUser.uid);

        if (cachedProfile) {
          setUser(currentUser);
          setUserProfile(cachedProfile);

          setForm((prev) => ({
            ...prev,
            householdId: prev.householdId || generateHouseholdId(),
            enumeratorId: cachedProfile.enumeratorId || prev.enumeratorId || "",
            enumeratorName:
              cachedProfile.name ||
              currentUser.displayName ||
              prev.enumeratorName ||
              "",
            enumeratorMobile:
              cachedProfile.mobile ||
              cachedProfile.phone ||
              prev.enumeratorMobile ||
              "",
          }));

          setCheckingAuth(false);
          return;
        }

        // -------------------------------------------
        // GET FIRESTORE USER PROFILE
        // -------------------------------------------

        const profileRef = doc(db, "enumerators", currentUser.uid);

        const profileSnap = await getDoc(profileRef);

        if (!mounted) return;

        // -------------------------------------------
        // PROFILE DOES NOT EXIST
        // -------------------------------------------

        if (!profileSnap.exists()) {
          console.error("Enumerator profile not found.");

          setUser(null);
          setUserProfile(null);
          setCheckingAuth(false);

          router.replace("/");

          return;
        }

        const profile = profileSnap.data();

        cacheEnumeratorProfile(currentUser.uid, profile);

        // -------------------------------------------
        // CHECK ACTIVE STATUS
        // -------------------------------------------

        const isActive = profile.status === "active";

        const validRole =
          profile.role === "enumerator" || profile.role === "admin";

        if (!isActive || !validRole) {
          console.warn("User is not active:", profile);

          setUser(null);
          setUserProfile(profile);
          setCheckingAuth(false);

          router.replace("/");

          return;
        }

        // -------------------------------------------
        // AUTHORIZED
        // -------------------------------------------

        setUser(currentUser);

        setUserProfile(profile);

        // -------------------------------------------
        // PRE-FILL FORM
        // -------------------------------------------

        setForm((prev) => ({
          ...prev,

          householdId: prev.householdId || generateHouseholdId(),

          enumeratorId: profile.enumeratorId || prev.enumeratorId || "",

          enumeratorName:
            profile.name ||
            currentUser.displayName ||
            prev.enumeratorName ||
            "",

          enumeratorMobile:
            profile.mobile || profile.phone || prev.enumeratorMobile || "",
        }));

        setCheckingAuth(false);
      } catch (error) {
        console.error("Authentication/profile error:", error);

        if (!mounted) return;

        setUser(null);
        setUserProfile(null);
        setCheckingAuth(false);

        setMessage("আপনার account যাচাই করা যায়নি।");

        setMessageType("error");

        router.replace("/");
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [router]);

  // =====================================================
  // HANDLE INPUT
  // =====================================================

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    let nextValue =
      type === "number" || type === "tel" ? value : value.toUpperCase();

    if (name === "selfEnumerationID") {
      nextValue = value
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 12)
        .toUpperCase();
    }

    if (name === "selfEnumeration" && value !== "হ্যাঁ") {
      setForm((prev) => ({
        ...prev,
        selfEnumeration: value,
        selfEnumerationID: "",
      }));

      if (message) {
        setMessage("");
        setMessageType("");
      }

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: nextValue,
    }));

    if (message) {
      setMessage("");
      setMessageType("");
    }
  };

  // =====================================================
  // GPS
  // =====================================================

  const captureLocation = () => {
    if (!navigator.geolocation) {
      setMessage("এই ডিভাইসে GPS/Location সুবিধা নেই।");

      setMessageType("error");

      return;
    }

    setMessage("GPS Location সংগ্রহ করা হচ্ছে...");

    setMessageType("info");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude.toFixed(7);

        const longitude = position.coords.longitude.toFixed(7);

        setForm((prev) => ({
          ...prev,
          latitude,
          longitude,
        }));

        setMessage("GPS Location সফলভাবে সংগ্রহ করা হয়েছে।");

        setMessageType("success");
      },

      (error) => {
        console.error("GPS error:", error);

        let errorMessage = "GPS Location সংগ্রহ করা যায়নি।";

        if (error.code === 1) {
          errorMessage =
            "Location permission দেওয়া হয়নি। Browser settings থেকে Location permission দিন।";
        } else if (error.code === 2) {
          errorMessage =
            "বর্তমানে Location পাওয়া যাচ্ছে না। GPS চালু করে আবার চেষ্টা করুন।";
        } else if (error.code === 3) {
          errorMessage =
            "Location সংগ্রহ করতে বেশি সময় লাগছে। আবার চেষ্টা করুন।";
        }

        setMessage(errorMessage);

        setMessageType("error");
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      },
    );
  };

  // =====================================================
  // RESET
  // =====================================================

  const resetForm = () => {
    setForm({
      ...initialForm,

      householdId: generateHouseholdId(),

      enumeratorId: userProfile?.enumeratorId || "",

      enumeratorName: userProfile?.name || user?.displayName || "",

      enumeratorMobile: userProfile?.mobile || userProfile?.phone || "",
    });

    setMessage("");
    setMessageType("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  // =====================================================
  // SUBMIT
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    // =================================================
    // AUTHENTICATION CHECK
    // =================================================

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setMessage("আপনি Login করা নেই। আবার Login করুন।");

      setMessageType("error");

      router.replace("/");

      return;
    }

    const profile = userProfile || readCachedEnumeratorProfile(currentUser.uid);

    if (!profile) {
      setMessage(
        "Enumerator data পাওয়া যায়নি। এই page-টি Internet connection সহ একবার খুলুন।",
      );

      setMessageType("error");

      return;
    }

    // =================================================
    // REQUIRED FIELDS
    // =================================================

    const requiredFields = [
      ["enumeratorId", "Enumerator ID"],
      ["enumeratorName", "গণনাকারীর নাম"],
      ["enumeratorMobile", "গণনাকারীর মোবাইল"],
      ["district", "জেলা"],
      ["block", "ব্লক / Municipality"],
      ["village", "গ্রাম / Locality"],
      ["houseAddress", "বাড়ির ঠিকানা"],
      ["buildingNo", "Building No."],
      ["headName", "গৃহপ্রধানের নাম"],
      ["selfEnumeration", "Self Enumeration"],
      ["householdMembers", "পরিবারের সদস্য সংখ্যা"],
    ].filter(() => requiredForHousehold);

    for (const [field, label] of requiredFields) {
      if (!form[field] || String(form[field]).trim() === "") {
        setMessage(`${label} পূরণ করুন।`);

        setMessageType("error");

        return;
      }
    }

    if (form.selfEnumeration === "হ্যাঁ") {
      if (!/^[A-Z0-9]{12}$/.test(String(form.selfEnumerationID || ""))) {
        setMessage(
          "Self Enumeration ID অবশ্যই ১২ অক্ষরের Capital Alpha Numeric Code হতে হবে।",
        );

        setMessageType("error");

        return;
      }
    }

    // =================================================
    // MOBILE VALIDATION
    // =================================================

    if (
      form.enumeratorMobile &&
      !/^[6-9]\d{9}$/.test(String(form.enumeratorMobile).trim())
    ) {
      setMessage("গণনাকারীর সঠিক ১০ সংখ্যার মোবাইল নম্বর দিন।");

      setMessageType("error");

      return;
    }

    if (
      form.headMobile &&
      !/^[6-9]\d{9}$/.test(String(form.headMobile).trim())
    ) {
      setMessage("গৃহপ্রধানের সঠিক ১০ সংখ্যার মোবাইল নম্বর দিন।");

      setMessageType("error");

      return;
    }

    // =================================================
    // PIN
    // =================================================

    if (form.pinCode && !/^\d{6}$/.test(String(form.pinCode).trim())) {
      setMessage("সঠিক ৬ সংখ্যার PIN Code দিন।");

      setMessageType("error");

      return;
    }

    // =================================================
    // MEMBER VALIDATION
    // =================================================

    const totalMembers = Number(form.householdMembers || 0);

    const male = Number(form.maleMembers || 0);

    const female = Number(form.femaleMembers || 0);

    const other = Number(form.otherMembers || 0);

    const calculatedMembers = male + female + other;

    // if (form.householdMembers && totalMembers !== calculatedMembers) {
    //   setMessage(
    //     `সদস্য সংখ্যায় ভুল আছে। পুরুষ (${male}) + মহিলা (${female}) + অন্যান্য (${other}) = ${calculatedMembers}; কিন্তু মোট সদস্য ${totalMembers}।`,
    //   );

    //   setMessageType("error");

    //   return;
    // }

    // =================================================
    // GPS VALIDATION
    // =================================================

    if (form.latitude || form.longitude) {
      const latitude = Number(form.latitude);

      const longitude = Number(form.longitude);

      if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
        setMessage("GPS Latitude / Longitude সঠিক নয়।");

        setMessageType("error");

        return;
      }
    }

    // =================================================
    // CONFIRMATION
    // =================================================

    const confirmed = window.confirm(
      "আপনি কি নিশ্চিত যে সমস্ত তথ্য সঠিকভাবে পূরণ করেছেন?\n\nতথ্য জমা দেওয়ার আগে একবার ভালোভাবে পরীক্ষা করুন।",
    );

    if (!confirmed) {
      return;
    }

    // =================================================
    // SAVE
    // =================================================

    setLoading(true);

    setMessage("তথ্য সংরক্ষণ করা হচ্ছে...");

    setMessageType("info");

    try {
      // -----------------------------------------------
      // HOUSEHOLD ID
      // -----------------------------------------------

      const householdId = form.householdId || generateHouseholdId();

      // -----------------------------------------------
      // DATA
      // -----------------------------------------------

      const docData = {
        // -------------------------------------------
        // IDENTIFICATION
        // -------------------------------------------

        householdId,

        surveyYear: 2027,

        status: "submitted",

        source: "census-2027-web",

        // -------------------------------------------
        // AUTHENTICATED USER
        // -------------------------------------------

        enumeratorUid: currentUser.uid,

        enumeratorEmail: currentUser.email || "",

        enumeratorId: form.enumeratorId,

        enumeratorName:
          profile.name || currentUser.displayName || form.enumeratorName || "",

        enumeratorMobile: form.enumeratorMobile,

        // -------------------------------------------
        // ADMINISTRATIVE
        // -------------------------------------------

        state: form.state,

        district: form.district,

        subdivision: form.subdivision,

        block: form.block,

        gramPanchayat: form.gramPanchayat,

        ward: form.ward,

        village: form.village,

        locality: form.locality,

        houseAddress: form.houseAddress,

        pinCode: form.pinCode,

        // -------------------------------------------
        // GPS
        // -------------------------------------------

        latitude: form.latitude !== "" ? Number(form.latitude) : null,

        longitude: form.longitude !== "" ? Number(form.longitude) : null,

        // -------------------------------------------
        // CENSUS
        // -------------------------------------------

        buildingNo: form.buildingNo,

        censusNo: form.censusNo,

        headName: form.headName,

        headMobile: form.headMobile,

        selfEnumeration: form.selfEnumeration,

        selfEnumerationID:
          form.selfEnumeration === "হ্যাঁ" ? form.selfEnumerationID : "",

        // -------------------------------------------
        // HOUSE
        // -------------------------------------------

        floorMaterial: form.floorMaterial,

        wallMaterial: form.wallMaterial,

        roofMaterial: form.roofMaterial,

        houseUse: form.houseUse,

        houseCondition: form.houseCondition,

        roomCount: form.roomCount,

        // -------------------------------------------
        // HOUSEHOLD
        // -------------------------------------------

        householdMembers: totalMembers,

        maleMembers: male,

        femaleMembers: female,

        otherMembers: other,

        caste: form.caste,

        houseOwnership: form.houseOwnership,

        marriedCouples: Number(form.marriedCouples || 0),

        // -------------------------------------------
        // WATER
        // -------------------------------------------

        drinkingWaterSource: form.drinkingWaterSource,

        drinkingWaterLocation: form.drinkingWaterLocation,

        // -------------------------------------------
        // LIGHTING
        // -------------------------------------------

        lightingSource: form.lightingSource,

        // -------------------------------------------
        // SANITATION
        // -------------------------------------------

        latrineAvailability: form.latrineAvailability,

        latrineType: form.latrineType,

        wasteWaterDrain: form.wasteWaterDrain,

        bathingArrangement: form.bathingArrangement,

        // -------------------------------------------
        // COOKING
        // -------------------------------------------

        cookingGas: form.cookingGas,

        cookingFuel: form.cookingFuel,

        // -------------------------------------------
        // ASSETS
        // -------------------------------------------

        radio: form.radio,

        television: form.television,

        internet: form.internet,

        laptopComputer: form.laptopComputer,

        mobilePhone: form.mobilePhone,

        bicycleVehicle: form.bicycleVehicle,

        carVan: form.carVan,

        // -------------------------------------------
        // FOOD
        // -------------------------------------------

        mainFoodGrain: form.mainFoodGrain,

        // -------------------------------------------
        // TIMESTAMPS
        // -------------------------------------------

        createdAt: serverTimestamp(),

        updatedAt: serverTimestamp(),

        submittedAt: serverTimestamp(),
      };

      // =================================================
      // FIRESTORE
      // =================================================

      const docRef = await addDoc(collection(db, "census2027"), docData);

      console.log("Census record created:", docRef.id);

      // =================================================
      // SUCCESS
      // =================================================

      setMessage(`তথ্য সফলভাবে সংরক্ষণ হয়েছে। Household ID: ${householdId}`);

      setMessageType("success");

      // =================================================
      // RESET
      // =================================================

      setForm({
        ...initialForm,

        householdId: generateHouseholdId(),

        enumeratorId: profile.enumeratorId || form.enumeratorId || "",

        enumeratorName:
          profile.name || currentUser.displayName || form.enumeratorName || "",

        enumeratorMobile:
          profile.mobile || profile.phone || form.enumeratorMobile || "",
      });

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (error) {
      console.error("Census submission error:", error);

      let errorMessage = "তথ্য সংরক্ষণ করা যায়নি।";

      if (error.code === "permission-denied") {
        errorMessage =
          "আপনার Census data submit করার অনুমতি নেই। আপনার account-এর role/status পরীক্ষা করুন।";
      } else if (error.code === "unavailable") {
        errorMessage =
          "Firebase বর্তমানে unavailable। Internet connection পরীক্ষা করে আবার চেষ্টা করুন।";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setMessage(errorMessage);

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // AUTH LOADING
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
  // FORM
  // =====================================================

  return (
    <main className="min-h-screen bg-gray-100 px-3 py-5 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-6xl">
        {/* =================================================
            HEADER
        ================================================= */}

        <header className="mb-5 overflow-hidden rounded-2xl bg-gradient-to-r from-green-900 via-green-700 to-green-600 text-white shadow-lg">
          <div className="px-4 py-6 text-center sm:px-8">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-green-100">
              Household Data Collection
            </div>

            <h1 className="text-2xl font-bold sm:text-3xl lg:text-4xl">
              Census 2027
            </h1>

            <p className="mt-2 text-sm text-green-100 sm:text-base">
              গৃহস্থালির তথ্য সংগ্রহ ফর্ম
            </p>

            {user && (
              <div className="mt-3">
                <p className="text-xs text-green-200">Logged in as</p>

                <p className="mt-0.5 text-sm font-bold text-white">
                  {userProfile?.name || user.displayName || user.email}
                </p>

                <p className="mt-0.5 text-xs text-green-200">
                  {user.email} •{" "}
                  {userProfile?.role === "admin"
                    ? "Administrator"
                    : "Enumerator"}
                </p>
              </div>
            )}
          </div>
        </header>

        {/* =================================================
            INSTRUCTIONS
        ================================================= */}

        {/* <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-bold">তথ্য সংগ্রহের নির্দেশনা</p>

          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>প্রতিটি পরিবারের জন্য একটি পৃথক তথ্য জমা দিন।</li>

            <li>জমা দেওয়ার আগে সমস্ত তথ্য ভালোভাবে যাচাই করুন।</li>

            <li>সম্ভব হলে বাড়ির GPS Location সংগ্রহ করুন।</li>

            <li>(*) চিহ্নিত ঘরগুলি অবশ্যই পূরণ করতে হবে।</li>
          </ul>
        </div> */}

        {/* =================================================
            FORM
        ================================================= */}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* =================================================
              1. ENUMERATOR
          ================================================= */}

          {/* <Section number="১" title="জরিপ ও গণনাকারীর তথ্য">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Household ID"
                name="householdId"
                form={form}
                onChange={handleChange}
                required={requiredForHousehold}
                readOnly
              />

              <Input
                label="Enumerator ID"
                name="enumeratorId"
                form={form}
                onChange={handleChange}
                required={requiredForHousehold}
                placeholder="গণনাকারীর ID"
              />

              <Input
                label="গণনাকারীর নাম"
                name="enumeratorName"
                form={form}
                onChange={handleChange}
                required={requiredForHousehold}
                placeholder="পূর্ণ নাম"
              />

              <Input
                label="গণনাকারীর মোবাইল"
                name="enumeratorMobile"
                form={form}
                onChange={handleChange}
                type="tel"
                required={requiredForHousehold}
                placeholder="১০ সংখ্যার মোবাইল নম্বর"
              />
            </div>
          </Section> */}

          {/* =================================================
              2. ADDRESS
          ================================================= */}

          {/* <Section number="২" title="ঠিকানা ও প্রশাসনিক তথ্য">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Input
                label="রাজ্য"
                name="state"
                form={form}
                onChange={handleChange}
                required={requiredForHousehold}
                readOnly
              />

              <Input
                label="জেলা"
                name="district"
                form={form}
                onChange={handleChange}
                required={requiredForHousehold}
              />

              <Input
                label="মহকুমা / Subdivision"
                name="subdivision"
                form={form}
                onChange={handleChange}
              />

              <Input
                label="ব্লক / Municipality"
                name="block"
                form={form}
                onChange={handleChange}
                required={requiredForHousehold}
              />

              <Input
                label="গ্রাম পঞ্চায়েত"
                name="gramPanchayat"
                form={form}
                onChange={handleChange}
              />

              <Input
                label="ওয়ার্ড নং"
                name="ward"
                form={form}
                onChange={handleChange}
              />

              <Input
                label="গ্রাম / Locality"
                name="village"
                form={form}
                onChange={handleChange}
                required={requiredForHousehold}
              />

              <Input
                label="পাড়া / Locality"
                name="locality"
                form={form}
                onChange={handleChange}
              />

              <Input
                label="PIN Code"
                name="pinCode"
                form={form}
                onChange={handleChange}
                type="text"
                max="6"
                placeholder="৬ সংখ্যার PIN"
              />
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                বাড়ির পূর্ণ ঠিকানা
                {requiredForHousehold && (
                  <span className="ml-1 text-red-500">*</span>
                )}
              </label>

              <textarea
                name="houseAddress"
                value={form.houseAddress}
                onChange={handleChange}
                required={requiredForHousehold}
                rows={3}
                placeholder="বাড়ির পূর্ণ ঠিকানা লিখুন"
                autoCapitalize="characters"
                style={{ textTransform: "uppercase" }}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
            </div>
          </Section> */}

          {/* =================================================
              3. CENSUS
          ================================================= */}

          <Section number="৩" title="Building ও Census তথ্য">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Building No."
                name="buildingNo"
                form={form}
                onChange={handleChange}
                required={requiredForHousehold}
              />

              <Input
                label="Census No."
                name="censusNo"
                form={form}
                onChange={handleChange}
              />

              <Input
                label="গৃহপ্রধানের নাম"
                name="headName"
                form={form}
                onChange={handleChange}
                required={requiredForHousehold}
                placeholder="গৃহপ্রধানের পূর্ণ নাম"
              />

              <Input
                label="গৃহপ্রধানের মোবাইল"
                name="headMobile"
                form={form}
                onChange={handleChange}
                type="tel"
                placeholder="১০ সংখ্যার মোবাইল নম্বর"
              />
            </div>

            <div className="mt-4">
              <Select
                label="Self Enumeration করেছেন কি না?"
                name="selfEnumeration"
                form={form}
                onChange={handleChange}
                required={requiredForHousehold}
                options={["হ্যাঁ", "না"]}
              />
            </div>

            {form.selfEnumeration === "হ্যাঁ" && (
              <div className="mt-4 max-w-md">
                <Input
                  label="Self Enumeration ID"
                  name="selfEnumerationID"
                  form={form}
                  onChange={handleChange}
                  required={requiredForHousehold}
                  placeholder="১২ অক্ষরের Capital Alpha Numeric Code"
                  maxLength={12}
                  pattern="[A-Z0-9]{12}"
                />
              </div>
            )}
          </Section>

          {/* =================================================
              4. HOUSE MATERIAL
          ================================================= */}

          <Section number="৪" title="বাড়ির গঠন ও উপাদান">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="মেঝের প্রধান উপাদান"
                name="floorMaterial"
                form={form}
                onChange={handleChange}
                options={[
                  "মাটি",
                  "কাঠ/বাঁশ",
                  "পোড়া ইট",
                  "পাথর",
                  "সিমেন্ট",
                  "মোজাইক/মেঝের টাইল",
                  "অন্যান্য",
                ]}
              />

              <Select
                label="দেওয়ালের প্রধান উপাদান"
                name="wallMaterial"
                form={form}
                onChange={handleChange}
                options={[
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
                ]}
              />

              <Select
                label="ছাদের প্রধান উপাদান"
                name="roofMaterial"
                form={form}
                onChange={handleChange}
                options={[
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
                ]}
              />
            </div>
          </Section>

          {/* =================================================
              5. HOUSE USE
          ================================================= */}

          <Section number="৫" title="বাড়ির ব্যবহার ও বর্তমান অবস্থা">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="এই সেন্সাস গৃহের প্রকৃত ব্যবহার"
                name="houseUse"
                form={form}
                onChange={handleChange}
                options={[
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
                ]}
              />

              <Select
                label="এই সেন্সাস গৃহের বর্তমান অবস্থা"
                name="houseCondition"
                form={form}
                onChange={handleChange}
                options={["ভালো", "বাসযোগ্য", "ক্ষতিগ্রস্ত"]}
              />
              <Input
                label="বসবাসযোগ্য ঘরের সংখ্যা"
                name="roomCount"
                form={form}
                onChange={handleChange}
                type="number"
                min="0"
              />
            </div>
          </Section>

          {/* =================================================
              6. MEMBERS
          ================================================= */}

          <Section number="৬" title="পরিবারের সদস্য সংখ্যা">
            {/* <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"> */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="পরিবারের মোট সদস্য"
                name="householdMembers"
                form={form}
                onChange={handleChange}
                type="number"
                min="0"
                required={requiredForHousehold}
              />

              {/* <Input
                label="পুরুষ"
                name="maleMembers"
                form={form}
                onChange={handleChange}
                type="number"
                min="0"
              />

              <Input
                label="মহিলা"
                name="femaleMembers"
                form={form}
                onChange={handleChange}
                type="number"
                min="0"
              />

              <Input
                label="অন্যান্য"
                name="otherMembers"
                form={form}
                onChange={handleChange}
                type="number"
                min="0"
              />
            </div>

            <div className="mt-4 max-w-xs"> */}
              <Input
                label="বিবাহিত দম্পতির সংখ্যা"
                name="marriedCouples"
                form={form}
                onChange={handleChange}
                type="number"
                min="0"
              />
            </div>
          </Section>

          {/* =================================================
              7. SOCIAL
          ================================================= */}

          <Section number="৭" title="সামাজিক ও মালিকানা তথ্য">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="পরিবারের প্রধানের জাতি"
                name="caste"
                form={form}
                onChange={handleChange}
                options={["তপশিলি জাতি", "তপশিলি উপজাতি", "অন্যান্য"]}
              />

              <Select
                label="গৃহের মালিকানা"
                name="houseOwnership"
                form={form}
                onChange={handleChange}
                options={[
                  "নিজের",
                  "ভাড়া, অন্য বাড়ি আছে",
                  "ভাড়া, বাড়ি নেই",
                  "অন্যান্য",
                ]}
              />
            </div>
          </Section>

          {/* =================================================
              8. WATER
          ================================================= */}

          <Section number="৮" title="পানীয় জল">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="পানীয় জলের প্রধান উৎস"
                name="drinkingWaterSource"
                form={form}
                onChange={handleChange}
                options={[
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
                ]}
              />

              <Select
                label="পানীয় জলের উৎসটি কোথায়?"
                name="drinkingWaterLocation"
                form={form}
                onChange={handleChange}
                options={[
                  "বাড়ির চৌহদ্দির মধ্যে",
                  "বাড়ির চৌহদ্দির কাছে",
                  "দূরে",
                ]}
              />
            </div>
          </Section>

          {/* =================================================
              9. LIGHT
          ================================================= */}

          <Section number="৯" title="আলোর ব্যবস্থা">
            <Select
              label="আলোর প্রধান উৎস"
              name="lightingSource"
              form={form}
              onChange={handleChange}
              options={[
                "বিদ্যুৎ",
                "কেরোসিন",
                "সৌরবিদ্যুৎ",
                "অন্যান্য তেল",
                "অন্য উৎস",
                "আলো নেই",
              ]}
            />
          </Section>

          {/* =================================================
              10. SANITATION
          ================================================= */}

          <Section number="১০" title="শৌচালয় ও স্যানিটেশন">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="শৌচালয়ের উপলভ্যতা"
                name="latrineAvailability"
                form={form}
                onChange={handleChange}
                options={[
                  "শুধু এই পরিবারের",
                  "যৌথভাবে",
                  "সর্বসাধারণের",
                  "খোলা জায়গায়",
                ]}
              />

              <Select
                label="শৌচালয়ের ধরন"
                name="latrineType"
                form={form}
                onChange={handleChange}
                options={[
                  "নলবাহিত পূর্ণশৌচালয়",
                  "সেপটিক ট্যাঙ্ক",
                  "অন্যান্য",
                  "দুটি কুয়ো/পিটযুক্ত",
                  "একটি কুয়ো/পিটযুক্ত",
                  "কাঁচা পায়খানা",
                  "মানুষ দ্বারা বাহিত",
                  "পশু দ্বারা বাহিত",
                  "খোলা নর্দমা দ্বারা",
                ]}
              />

              <Select
                label="বর্জ্য জলের নিষ্কাশন"
                name="wasteWaterDrain"
                form={form}
                onChange={handleChange}
                options={["ঢাকা নর্দমা", "খোলা নর্দমা", "কোন নর্দমা নেই"]}
              />

              <Select
                label="বাড়ির মধ্যে স্নানের ব্যবস্থা"
                name="bathingArrangement"
                form={form}
                onChange={handleChange}
                options={[
                  "স্নানের ঘর আছে",
                  "ছাদবিহীন ঘেরা জায়গা আছে",
                  "না, ব্যবস্থা নেই",
                ]}
              />
            </div>
          </Section>

          {/* =================================================
              11. COOKING
          ================================================= */}

          <Section number="১১" title="রান্নার গ্যাস ও জ্বালানি">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="রান্নার গ্যাস (LPG/CNG) সংযোগের অবস্থা"
                name="cookingGas"
                form={form}
                onChange={handleChange}
                options={[
                  "সংযোগ আছে",
                  "সংযোগ নেই",
                  "বাড়ির ভিতরে রান্নার চুলা",
                  "বাড়ির বাইরে/খোলা জায়গায় রান্নার চুলা",
                  "রান্না হয় না",
                ]}
              />

              <Select
                label="রান্নায় ব্যবহৃত প্রধান জ্বালানি"
                name="cookingFuel"
                form={form}
                onChange={handleChange}
                options={[
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
                ]}
              />
            </div>
          </Section>

          {/* =================================================
              12. ASSETS
          ================================================= */}

          <Section number="১২" title="যোগাযোগ, প্রযুক্তি ও অন্যান্য সুবিধা">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Select
                label="রেডিও / ট্রানজিস্টর"
                name="radio"
                form={form}
                onChange={handleChange}
                options={[
                  "সাধারণ রেডিও",
                  "মোবাইল/স্মার্টফোন",
                  "অন্যান্য",
                  "না",
                ]}
              />

              <Select
                label="টেলিভিশন"
                name="television"
                form={form}
                onChange={handleChange}
                options={[
                  "দূরদর্শন DTH",
                  "স্যাটেলাইট",
                  "অন্যান্য DTH",
                  "কেবল সংযোগ",
                  "অন্যান্য",
                  "না",
                ]}
              />

              <Select
                label="ইন্টারনেট"
                name="internet"
                form={form}
                onChange={handleChange}
                options={[
                  "মোবাইল ডেটা",
                  "ব্রডব্যান্ড",
                  "Wi-Fi",
                  "অন্যান্য",
                  "না",
                ]}
              />

              <Select
                label="ল্যাপটপ / কম্পিউটার"
                name="laptopComputer"
                form={form}
                onChange={handleChange}
                options={["হ্যাঁ", "না"]}
              />

              <Select
                label="টেলিফোন / মোবাইল ফোন"
                name="mobilePhone"
                form={form}
                onChange={handleChange}
                options={[
                  "ল্যান্ডলাইন",
                  "সাধারণ মোবাইল",
                  "স্মার্টফোন",
                  "ল্যান্ডলাইন ও মোবাইল উভয়",
                  "না",
                ]}
              />

              <Select
                label="সাইকেল / স্কুটার / মোটরসাইকেল / মোপেড"
                name="bicycleVehicle"
                form={form}
                onChange={handleChange}
                options={[
                  "সাইকেল",
                  "স্কুটার/মোটরসাইকেল/মোপেড",
                  "দুটিই আছে",
                  "কোনোটিই নেই",
                ]}
              />

              <Select
                label="চার চাকার গাড়ি / জিপ / মোটর ভ্যান"
                name="carVan"
                form={form}
                onChange={handleChange}
                options={["হ্যাঁ", "না"]}
              />

              <Select
                label="প্রধান খাদ্যশস্য"
                name="mainFoodGrain"
                form={form}
                onChange={handleChange}
                options={["ধান", "গম", "জোয়ার", "বাজরা", "ভুট্টা", "অন্যান্য"]}
              />
            </div>
          </Section>

          {/* =================================================
              13. GPS
          ================================================= */}

          <Section number="১৩" title="বাড়ির GPS অবস্থান">
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-bold text-gray-800">
                    GPS Location সংগ্রহ করুন
                  </p>

                  <p className="mt-1 text-xs text-gray-600">
                    সম্ভব হলে বাড়ির অবস্থান নির্ধারণের জন্য GPS Location সংগ্রহ
                    করুন।
                  </p>
                </div>

                <button
                  type="button"
                  onClick={captureLocation}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-blue-700 active:scale-95"
                >
                  📍 GPS Location নিন
                </button>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs text-gray-500">Latitude</p>

                  <p className="mt-1 font-semibold text-gray-800">
                    {form.latitude || "Not captured"}
                  </p>
                </div>

                <div className="rounded-lg bg-white p-3">
                  <p className="text-xs text-gray-500">Longitude</p>

                  <p className="mt-1 font-semibold text-gray-800">
                    {form.longitude || "Not captured"}
                  </p>
                </div>
              </div>
            </div>
          </Section>

          {/* =================================================
              14. FINAL CHECK
          ================================================= */}

          <Section number="১৪" title="চূড়ান্ত যাচাই">
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <p className="font-bold text-yellow-900">
                জমা দেওয়ার আগে যাচাই করুন
              </p>

              <ul className="mt-3 space-y-2 text-sm text-yellow-900">
                <li>
                  ✓ Building No.: {form.buildingNo || "Not provided"} এবং Census
                  No. {form.censusNo || "Not provided"} সঠিক আছে।
                </li>

                <li>
                  ✓ গৃহপ্রধানের নাম: {form.headOfHousehold || "Not provided"}{" "}
                  সঠিকভাবে লেখা হয়েছে।
                </li>

                <li>
                  ✓ মোট সদস্য: {form.totalMembers || "Not provided"} এবং
                  পুরুষ/মহিলা/অন্যান্য সদস্যের সংখ্যা মিলছে।
                </li>

                <li>✓ বাড়ির ঠিকানা সঠিক।</li>

                <li>
                  ✓ পানীয় জল, শৌচালয়, রান্নার জ্বালানি ইত্যাদির তথ্য যাচাই করা
                  হয়েছে।
                </li>

                <li>✓ GPS Location সম্ভব হলে সংগ্রহ করা হয়েছে।</li>
              </ul>
            </div>
          </Section>

          {/* =================================================
              MESSAGE
          ================================================= */}

          {message && (
            <div
              className={`rounded-xl border px-4 py-3 text-center text-sm font-semibold shadow ${
                messageType === "success"
                  ? "border-green-300 bg-green-100 text-green-800"
                  : messageType === "error"
                    ? "border-red-300 bg-red-100 text-red-800"
                    : "border-blue-300 bg-blue-100 text-blue-800"
              }`}
            >
              {message}
            </div>
          )}

          {/* =================================================
              SUBMIT
          ================================================= */}

          <div className="sticky bottom-2 z-30 rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={resetForm}
                disabled={loading}
                className="w-full rounded-xl border border-gray-300 bg-white px-5 py-3 font-bold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-1/3"
              >
                ফর্ম পরিষ্কার করুন
              </button>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-green-700 px-5 py-3 font-bold text-white shadow-md transition hover:bg-green-800 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 sm:w-2/3"
              >
                {loading
                  ? "⏳ তথ্য সংরক্ষণ করা হচ্ছে..."
                  : "✓ Census 2027 তথ্য জমা দিন"}
              </button>
            </div>
          </div>
        </form>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="py-6 text-center text-xs text-gray-500">
          <p className="font-semibold">
            Census 2027 — Household Data Collection
          </p>

          <p className="mt-1">
            All collected information should be verified before submission.
          </p>
        </footer>
      </div>
    </main>
  );
}
