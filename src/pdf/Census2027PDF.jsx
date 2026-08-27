"use client";

import React, { useState } from "react";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
} from "@react-pdf/renderer";

/*
==============================================================
BENGALI FONT
==============================================================

Put these files in:

public/fonts/
  NotoSansBengali-Regular.ttf
  NotoSansBengali-Bold.ttf
*/

Font.register({
  family: "NotoSansBengali",
  fonts: [
    {
      src: "/fonts/NotoSansBengali-Regular.ttf",
      fontWeight: "normal",
    },
    {
      src: "/fonts/NotoSansBengali-Bold.ttf",
      fontWeight: "bold",
    },
  ],
});

/*
==============================================================
HELPERS
==============================================================
*/

function valueOf(value) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  return String(value);
}

function formatDate(value) {
  if (!value) return "—";

  try {
    let date;

    // Firestore Timestamp
    if (typeof value === "object" && typeof value.toDate === "function") {
      date = value.toDate();
    }

    // Firestore timestamp object
    else if (typeof value === "object" && value.seconds !== undefined) {
      date = new Date(Number(value.seconds) * 1000);
    }

    // Date
    else if (value instanceof Date) {
      date = value;
    } else {
      date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
      return valueOf(value);
    }

    const dd = String(date.getDate()).padStart(2, "0");

    const mm = String(date.getMonth() + 1).padStart(2, "0");

    const yyyy = date.getFullYear();

    const hh = String(date.getHours()).padStart(2, "0");

    const min = String(date.getMinutes()).padStart(2, "0");

    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
  } catch {
    return valueOf(value);
  }
}

/*
==============================================================
STYLES

IMPORTANT:
This layout is sized to use the available A4 page while keeping
the complete record on ONE page.
==============================================================
*/

const styles = StyleSheet.create({
  page: {
    width: "100%",

    paddingTop: 24,
    paddingBottom: 24,
    paddingLeft: 28,
    paddingRight: 28,

    fontFamily: "NotoSansBengali",

    // Increased from 6.5
    fontSize: 8.2,

    color: "#111111",

    backgroundColor: "#ffffff",
  },

  /* ==========================================================
     HEADER
  ========================================================== */

  header: {
    height: 72,

    border: "0.9 solid #222222",

    backgroundColor: "#edf8f0",

    justifyContent: "center",
    alignItems: "center",

    paddingVertical: 7,
  },

  title: {
    fontSize: 19,

    fontFamily: "NotoSansBengali",
    fontWeight: "bold",

    color: "#075c2d",

    textAlign: "center",
  },

  subtitle: {
    marginTop: 4,

    fontSize: 10,

    textAlign: "center",

    color: "#333333",
  },

  /* ==========================================================
     TOP INFORMATION
  ========================================================== */

  topTable: {
    borderLeft: "0.9 solid #222222",
    borderRight: "0.9 solid #222222",
    borderBottom: "0.9 solid #222222",
  },

  row: {
    flexDirection: "row",

    minHeight: 28,

    borderBottom: "0.7 solid #444444",
  },

  rowLast: {
    flexDirection: "row",

    minHeight: 28,
  },

  cell: {
    width: "25%",

    flexDirection: "row",

    borderRight: "0.7 solid #444444",
  },

  cellLast: {
    width: "25%",

    flexDirection: "row",
  },

  label: {
    width: "46%",

    backgroundColor: "#f4f4f4",

    borderRight: "0.6 solid #777777",

    paddingLeft: 4,
    paddingRight: 3,

    justifyContent: "center",

    fontFamily: "NotoSansBengali",
    fontWeight: "bold",

    fontSize: 7.1,
  },

  value: {
    width: "54%",

    paddingLeft: 4,
    paddingRight: 3,

    justifyContent: "center",

    fontSize: 7.4,
  },

  /* ==========================================================
     SECTION HEADER
  ========================================================== */

  sectionTitle: {
    height: 25,

    flexDirection: "row",

    alignItems: "center",

    backgroundColor: "#e8f5e9",

    borderLeft: "0.9 solid #222222",
    borderRight: "0.9 solid #222222",
    borderBottom: "0.8 solid #222222",

    paddingLeft: 6,
  },

  sectionNumber: {
    width: 20,
    height: 18,

    borderRadius: 9,

    backgroundColor: "#087f3d",

    color: "#ffffff",

    textAlign: "center",

    paddingTop: 3,

    fontSize: 8,

    fontFamily: "NotoSansBengali",
    fontWeight: "bold",
  },

  sectionText: {
    marginLeft: 7,

    fontSize: 9,

    fontFamily: "NotoSansBengali",
    fontWeight: "bold",

    color: "#075c2d",
  },

  /* ==========================================================
     DATA GRID
  ========================================================== */

  grid: {
    borderLeft: "0.9 solid #222222",
    borderRight: "0.9 solid #222222",
  },

  gridRow: {
    flexDirection: "row",
    minHeight: 31,
    borderBottom: "0.7 solid #444444",
  },

  gridRowLast: {
    flexDirection: "row",
    minHeight: 31,
  },

  gridField: {
    width: "25%",

    flexDirection: "row",

    borderRight: "0.7 solid #444444",
  },

  gridFieldLast: {
    width: "25%",

    flexDirection: "row",
  },

  gridLabel: {
    width: "45%",
    backgroundColor: "#fafafa",
    borderRight: "0.6 solid #888888",

    paddingLeft: 5,
    paddingRight: 3,

    justifyContent: "center",

    fontFamily: "NotoSansBengali",
    fontWeight: "bold",

    fontSize: 7,
  },

  gridValue: {
    width: "55%",

    paddingLeft: 5,
    paddingRight: 3,

    justifyContent: "center",

    fontSize: 7.4,
  },

  /* ==========================================================
     SIGNATURE
  ========================================================== */

  signature: {
    marginTop: 18,

    flexDirection: "row",

    justifyContent: "space-between",
  },

  signatureBox: {
    width: "30%",

    textAlign: "center",

    paddingTop: 5,

    borderTop: "0.7 solid #555555",

    fontSize: 7.2,
  },

  /* ==========================================================
     FOOTER
  ========================================================== */

  footer: {
    marginTop: 9,

    flexDirection: "row",

    justifyContent: "space-between",

    fontSize: 6.8,

    color: "#555555",
  },

  pageNumber: {
    position: "absolute",

    bottom: 9,

    right: 28,

    fontSize: 6,

    color: "#777777",
  },
});

/*
==============================================================
FIELD
==============================================================
*/

function DataField({ label, value, last = false }) {
  return (
    <View style={last ? styles.gridFieldLast : styles.gridField}>
      <View style={styles.gridLabel}>
        <Text>{label}</Text>
      </View>

      <View style={styles.gridValue}>
        <Text>{valueOf(value)}</Text>
      </View>
    </View>
  );
}

/*
==============================================================
GRID ROW
==============================================================
*/

function DataRow({ fields, last = false }) {
  return (
    <View style={last ? styles.gridRowLast : styles.gridRow}>
      {fields.map((field, index) => (
        <DataField
          key={`${field.label}-${index}`}
          label={field.label}
          value={field.value}
          last={index === 3}
        />
      ))}

      {/* Fill empty cells if fewer than 4 */}
      {fields.length < 4 &&
        Array.from({
          length: 4 - fields.length,
        }).map((_, index) => (
          <View
            key={`empty-${index}`}
            style={
              index === 3 - fields.length
                ? styles.gridFieldLast
                : styles.gridField
            }
          />
        ))}
    </View>
  );
}

/*
==============================================================
SECTION
==============================================================
*/

function Section({ number, title, rows }) {
  return (
    <View>
      <View style={styles.sectionTitle}>
        <View style={styles.sectionNumber}>
          <Text>{number}</Text>
        </View>

        <Text style={styles.sectionText}>{title}</Text>
      </View>

      <View style={styles.grid}>
        {rows.map((fields, index) => (
          <DataRow
            key={index}
            fields={fields}
            last={index === rows.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

/*
==============================================================
ONE CENSUS PAGE
==============================================================
*/

function CensusPage({ data }) {
  const d = data || {};

  return (
    <Page size="A4" orientation="portrait" style={styles.page}>
      {/* =====================================================
          HEADER
      ===================================================== */}

      <View style={styles.header}>
        <Text style={styles.title}>Census 2027</Text>

        <Text style={styles.subtitle}>গৃহস্থালির তথ্য সংগ্রহপত্র</Text>
      </View>

      {/* =====================================================
          BASIC INFORMATION
      ===================================================== */}

      <View style={styles.topTable}>
        <View style={styles.row}>
          <View style={styles.cell}>
            <View style={styles.label}>
              <Text>Building No.</Text>
            </View>

            <View style={styles.value}>
              <Text>{valueOf(d.buildingNo)}</Text>
            </View>
          </View>

          <View style={styles.cell}>
            <View style={styles.label}>
              <Text>Census No.</Text>
            </View>

            <View style={styles.value}>
              <Text>{valueOf(d.censusNo)}</Text>
            </View>
          </View>

          <View style={styles.cell}>
            <View style={styles.label}>
              <Text>গৃহপ্রধান</Text>
            </View>

            <View style={styles.value}>
              <Text>{valueOf(d.headName)}</Text>
            </View>
          </View>

          <View style={styles.cellLast}>
            <View style={styles.label}>
              <Text>সদস্য</Text>
            </View>

            <View style={styles.value}>
              <Text>{valueOf(d.householdMembers)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.rowLast}>
          <View style={styles.cell}>
            <View style={styles.label}>
              <Text>গণনাকারী</Text>
            </View>

            <View style={styles.value}>
              <Text>{valueOf(d.enumeratorName)}</Text>
            </View>
          </View>

          <View style={styles.cell}>
            <View style={styles.label}>
              <Text>Self ID</Text>
            </View>

            <View style={styles.value}>
              <Text>{valueOf(d.selfEnumerationID)}</Text>
            </View>
          </View>

          <View style={styles.cell}>
            <View style={styles.label}>
              <Text>Self Enumeration</Text>
            </View>

            <View style={styles.value}>
              <Text>{valueOf(d.selfEnumeration)}</Text>
            </View>
          </View>

          <View style={styles.cellLast}>
            <View style={styles.label}>
              <Text>তারিখ</Text>
            </View>

            <View style={styles.value}>
              <Text>{formatDate(d.createdAt)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* =====================================================
          SECTION 1
      ===================================================== */}

      <Section
        number="১"
        title="গৃহপ্রধান ও পরিবারের তথ্য"
        rows={[
          [
            {
              label: "গৃহপ্রধানের নাম",
              value: d.headName,
            },
            {
              label: "পরিবার সংখ্যা",
              value: d.householdNo,
            },
            {
              label: "মোবাইল",
              value: d.headMobile,
            },
            {
              label: "সদস্য সংখ্যা",
              value: d.householdMembers,
            },
            {
              label: "বিবাহিত দম্পতি",
              value: d.marriedCouples,
            },
          ],
          [
            {
              label: "জাতি",
              value: d.caste,
            },
            {
              label: "ঘরের সংখ্যা",
              value: d.roomCount,
            },
            {
              label: "মালিকানা",
              value: d.houseOwnership,
            },
            {
              label: "গৃহের ব্যবহার",
              value: d.houseUse,
            },
          ],
        ]}
      />

      {/* =====================================================
          SECTION 2
      ===================================================== */}

      <Section
        number="২"
        title="বাড়ির নির্মাণ উপাদান ও অবস্থা"
        rows={[
          [
            {
              label: "মেঝে",
              value: d.floorMaterial,
            },
            {
              label: "দেওয়াল",
              value: d.wallMaterial,
            },
            {
              label: "ছাদ",
              value: d.roofMaterial,
            },
            {
              label: "অবস্থা",
              value: d.houseCondition,
            },
          ],
        ]}
      />

      {/* =====================================================
          SECTION 3
      ===================================================== */}

      <Section
        number="৩"
        title="পানীয় জল ও স্যানিটেশন"
        rows={[
          [
            {
              label: "জলের উৎস",
              value: d.drinkingWaterSource,
            },
            {
              label: "উৎসের অবস্থান",
              value: d.drinkingWaterLocation,
            },
            {
              label: "শৌচালয়",
              value: d.latrineAvailability,
            },
            {
              label: "শৌচালয়ের ধরন",
              value: d.latrineType,
            },
          ],
          [
            {
              label: "বর্জ্য জল",
              value: d.wasteWaterDrain,
            },
            {
              label: "স্নানের ব্যবস্থা",
              value: d.bathingArrangement,
            },
            {
              label: "আলোর উৎস",
              value: d.lightingSource,
            },
            {
              label: "রান্নার গ্যাস",
              value: d.cookingGas,
            },
          ],
        ]}
      />

      {/* =====================================================
          SECTION 4
      ===================================================== */}

      <Section
        number="৪"
        title="রান্না ও প্রধান খাদ্য"
        rows={[
          [
            {
              label: "রান্নার জ্বালানি",
              value: d.cookingFuel,
            },
            {
              label: "প্রধান খাদ্যশস্য",
              value: d.mainFoodGrain,
            },
            {
              label: "রেডিও",
              value: d.radio,
            },
            {
              label: "টেলিভিশন",
              value: d.television,
            },
          ],
        ]}
      />

      {/* =====================================================
          SECTION 5
      ===================================================== */}

      <Section
        number="৫"
        title="যোগাযোগ ও প্রযুক্তি"
        rows={[
          [
            {
              label: "ইন্টারনেট",
              value: d.internet,
            },
            {
              label: "ল্যাপটপ/কম্পিউটার",
              value: d.laptopComputer,
            },
            {
              label: "মোবাইল ফোন",
              value: d.mobilePhone,
            },
            {
              label: "সাইকেল/দুই-চাকা",
              value: d.bicycleVehicle,
            },
          ],
          [
            {
              label: "চার চাকার গাড়ি",
              value: d.carVan,
            },
            {
              label: "Self ID",
              value: d.selfEnumerationID,
            },
            {
              label: "গণনাকারী",
              value: d.enumeratorName,
            },
            {
              label: "জমার সময়",
              value: formatDate(d.createdAt),
            },
          ],
        ]}
      />

      {/* =====================================================
          SIGNATURE
      ===================================================== */}

      {/* <View style={styles.signature}>
        <Text style={styles.signatureBox}>গৃহপ্রধানের স্বাক্ষর</Text>

        <Text style={styles.signatureBox}>গণনাকারীর স্বাক্ষর</Text>

        <Text style={styles.signatureBox}>যাচাইকারীর স্বাক্ষর</Text>
      </View> */}

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <View style={styles.footer}>
        <Text>Census 2027 — Household Data Collection</Text>

        <Text>All information should be verified before submission.</Text>
      </View>

      <Text
        style={styles.pageNumber}
        fixed
        render={({ pageNumber, totalPages }) =>
          `Page ${pageNumber} / ${totalPages}`
        }
      />
    </Page>
  );
}

/*
==============================================================
DOCUMENT FOR ONE RECORD
==============================================================
*/

export function Census2027Document({ data }) {
  return (
    <Document
      title="Census 2027 Household Data"
      author="Census 2027"
      subject="Household Census Data"
      creator="Census 2027"
    >
      <CensusPage data={data} />
    </Document>
  );
}

/*
==============================================================
BULK DOCUMENT

One household = one A4 page.

Example:

records = [
  household1,
  household2,
  household3
]

will create:

Page 1 -> household1
Page 2 -> household2
Page 3 -> household3
==============================================================
*/

export function Census2027BulkDocument({ records = [] }) {
  return (
    <Document
      title="Census 2027 Bulk Household Data"
      author="Census 2027"
      subject="Census 2027 Household Data"
      creator="Census 2027"
    >
      {records.map((record, index) => (
        <CensusPage
          key={record?.docId || record?.id || record?.censusNo || index}
          data={record}
        />
      ))}
    </Document>
  );
}

/*
==============================================================
DOWNLOAD SINGLE PDF
==============================================================
*/

export async function downloadCensus2027PDF(data) {
  if (!data) {
    throw new Error("Census data not available.");
  }

  const blob = await pdf(<Census2027Document data={data} />).toBlob();

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  const censusNo =
    data.censusNo || data.buildingNo || data.docId || "Census2027";

  link.download = `Census-2027-${censusNo}.pdf`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/*
==============================================================
DOWNLOAD BULK PDF
==============================================================

This creates ONE PDF.

For example 100 records:

Census-2027-Bulk-100-Records.pdf

Page 1 -> Record 1
Page 2 -> Record 2
...
Page 100 -> Record 100
==============================================================
*/

export async function downloadBulkCensus2027PDF(records) {
  if (!records || records.length === 0) {
    throw new Error("No Census records selected.");
  }

  const blob = await pdf(<Census2027BulkDocument records={records} />).toBlob();

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  const date = new Date().toISOString().slice(0, 10);

  link.download = `Census-2027-Bulk-${records.length}-Records-${date}.pdf`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/*
==============================================================
SINGLE DOWNLOAD BUTTON
==============================================================
*/

export function CensusPDFButton({ data, className = "" }) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);

      await downloadCensus2027PDF(data);
    } catch (error) {
      console.error("PDF download error:", error);

      alert("PDF তৈরি করা যায়নি।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-lg bg-green-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 sm:text-sm ${className}`}
    >
      {loading ? "Generating..." : "Download"}
    </button>
  );
}

/*
==============================================================
BULK DOWNLOAD BUTTON
==============================================================
*/

export function CensusBulkPDFButton({ records = [], className = "" }) {
  const [loading, setLoading] = useState(false);

  const handleBulkDownload = async () => {
    // Make sure we actually have an array
    if (!Array.isArray(records)) {
      console.error("CensusBulkPDFButton: records is not an array:", records);

      alert("Census data পাওয়া যাচ্ছে না।");

      return;
    }

    if (records.length === 0) {
      alert("কোনও Census record পাওয়া যায়নি।");

      return;
    }

    try {
      setLoading(true);

      await downloadBulkCensus2027PDF(records);
    } catch (error) {
      console.error("Bulk PDF error:", error);

      alert("Bulk PDF তৈরি করা যায়নি।");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBulkDownload}
      disabled={loading}
      className={`inline-flex items-center justify-center rounded-lg bg-green-700 px-5 py-2.5 text-sm font-bold text-white shadow transition hover:bg-green-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {loading ? (
        <>
          <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          PDF তৈরি হচ্ছে...
        </>
      ) : (
        <>
          <span className="mr-2">📚</span>
          Bulk PDF Download
          {Array.isArray(records) &&
            records.length > 0 &&
            ` (${records.length})`}
        </>
      )}
    </button>
  );
}
/*
==============================================================
DEFAULT EXPORT
==============================================================
*/

export default CensusPDFButton;
