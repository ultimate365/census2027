"use client";

import React, { useState } from "react";

import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";

/* ============================================================
   BENGALI FONT
   ============================================================ */

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

/* ============================================================
   CODE MAPPINGS
   ============================================================ */

const normalize = (v) =>
  String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

function getCode(value, map) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const text = normalize(value);

  /* Already a code */
  if (/^\d+$/.test(text)) {
    return text;
  }

  if (map[text] !== undefined) {
    return String(map[text]);
  }

  for (const [key, code] of Object.entries(map)) {
    if (text.includes(key)) {
      return String(code);
    }
  }

  return "";
}

/* ============================================================
   Q4 FLOOR
   ============================================================ */

const FLOOR_CODES = {
  মাটি: 1,
  mud: 1,

  কাঠ: 2,
  বাঁশ: 2,
  wood: 2,

  "পোড়া ইট": 3,
  "পোড়া ইট": 3,
  "burnt brick": 3,

  পাথর: 4,
  stone: 4,

  সিমেন্ট: 5,
  cement: 5,

  মোজাইক: 6,
  "ফ্লোর টাইলস": 6,
  "মোজাইক/ফ্লোর টাইলস": 6,

  অন্যান্য: 7,
  other: 7,
};

/* ============================================================
   Q5 WALL
   ============================================================ */

const WALL_CODES = {
  ঘাস: 1,
  খড়: 1,
  খড়: 1,
  বাঁশ: 1,

  প্লাস্টিক: 2,
  পলিথিন: 2,

  মাটি: 3,
  "কাঁচা ইট": 3,

  কাঠ: 4,

  পাথর: 5,

  "পাথর পাকা": 6,

  জিআই: 7,
  "জি আই": 7,
  মেটাল: 7,
  অ্যাসবেস্টস: 7,

  "পোড়া ইট": 8,
  "পোড়া ইট": 8,

  কংক্রিট: 9,

  অন্যান্য: 0,
};

/* ============================================================
   Q6 ROOF
   ============================================================ */

const ROOF_CODES = {
  ঘাস: 1,
  খড়: 1,
  খড়: 1,
  বাঁশ: 1,
  কাঠ: 1,
  মাটি: 1,

  প্লাস্টিক: 2,
  পলিথিন: 2,

  "দেশি টালি": 3,
  "হাত তৈরি টালি": 3,

  "মেশিন তৈরি টালি": 4,
  "মেশিনে তৈরি টালি": 4,

  "পোড়া ইট": 5,
  "পোড়া ইট": 5,

  পাথর: 6,

  স্লেট: 7,

  জিআই: 8,
  "জি আই": 8,
  মেটাল: 8,
  অ্যাসবেস্টস: 8,

  কংক্রিট: 9,

  অন্যান্য: 0,
};

/* ============================================================
   Q7 HOUSE USE
   ============================================================ */

const HOUSE_USE_CODES = {
  বাসগৃহ: 1,
  residence: 1,

  "বাসগৃহ-সহ অন্যান্য ব্যবহার": 2,
  "বাসগৃহ সহ অন্যান্য ব্যবহার": 2,

  "দোকান/অফিস": 3,

  "স্কুল/কলেজ": 4,

  হোটেল: 5,
  লজ: 5,
  অতিথিশালা: 5,

  হাসপাতাল: 6,
  ডিসপেনসারি: 6,

  কারখানা: 7,
  কর্মশালা: 7,
  ওয়ার্কশপ: 7,

  "ধর্মীয় স্থান": 8,
  "ধর্মীয় স্থান": 8,
  উপাসনালয়: 8,
  উপাসনালয়: 8,

  অন্যান্য: 9,

  খালি: 0,
};

/* ============================================================
   Q8 CONDITION
   ============================================================ */

const CONDITION_CODES = {
  ভালো: 1,
  good: 1,

  বাসযোগ্য: 2,
  livable: 2,

  জীর্ণ: 3,
  জীর্ণশীর্ণ: 3,
  ভগ্ন: 3,
};

/* ============================================================
   Q12 SEX
   ============================================================ */

const SEX_CODES = {
  পুরুষ: 1,
  male: 1,

  মহিলা: 2,
  নারী: 2,
  female: 2,

  "তৃতীয় লিঙ্গ": 3,
  "তৃতীয় লিঙ্গ": 3,
  transgender: 3,
};

/* ============================================================
   Q13 CASTE
   ============================================================ */

const CASTE_CODES = {
  "তপশিলি জাতি": 1,
  sc: 1,
  এসসি: 1,

  "তপশিলি উপজাতি": 2,
  st: 2,
  এসটি: 2,

  অন্যান্য: 3,
  other: 3,
};

/* ============================================================
   Q14 OWNERSHIP
   ============================================================ */

const OWNERSHIP_CODES = {
  নিজের: 1,
  নিজস্ব: 1,
  owned: 1,

  "ভাড়া, অন্য বাড়ি আছে": 2,
  "ভাড়া, অন্য বাড়ি আছে": 2,

  "ভাড়া, বাড়ি নেই": 3,
  "ভাড়া, বাড়ি নেই": 3,

  অন্যান্য: 4,
};

/* ============================================================
   Q17 WATER SOURCE
   ============================================================ */

const WATER_CODES = {
  "পরিশুদ্ধ কলের জল": 1,
  "পরিশোধিত কলের জল": 1,

  "অ-পরিশুদ্ধ কলের জল": 2,
  "অপরিশুদ্ধ কলের জল": 2,

  কুয়ো: 3,
  কুয়ো: 3,

  "হ্যান্ড পাম্প": 4,
  হ্যান্ডপাম্প: 4,

  টিউবওয়েল: 5,
  টিউবওয়েল: 5,
  বোরওয়েল: 5,
  বোরওয়েল: 5,

  ঝরনা: 6,

  নদী: 7,
  খাল: 7,

  পুকুর: 8,
  ট্যাংক: 8,
  হ্রদ: 8,

  "বোতলজাত জল": 9,
  "প্যাকেট জল": 9,

  অন্যান্য: 0,
};

/* ============================================================
   Q18 WATER LOCATION
   ============================================================ */

const WATER_LOCATION_CODES = {
  "বাড়ির মধ্যে": 1,
  "বাড়ির মধ্যে": 1,

  "বাড়ির কাছে": 2,
  "বাড়ির কাছে": 2,

  দূরে: 3,
};

/* ============================================================
   Q19 LIGHTING
   ============================================================ */

const LIGHTING_CODES = {
  বিদ্যুৎ: 1,
  electricity: 1,

  কেরোসিন: 2,

  সৌরবিদ্যুৎ: 3,
  সৌর: 3,

  "অন্যান্য তেল": 4,

  অন্যান্য: 5,

  "আলো নেই": 6,
};

/* ============================================================
   Q20 LATRINE ACCESS
   ============================================================ */

const LATRINE_ACCESS_CODES = {
  একক: 1,
  নিজস্ব: 1,
  "শুধু পরিবারের": 1,

  যৌথ: 2,

  সর্বসাধারণের: 3,

  খোলা: 4,
};

/* ============================================================
   Q21 LATRINE TYPE
   ============================================================ */

const LATRINE_TYPE_CODES = {
  "ফ্লাশ-নর্দমা": 1,

  "ফ্লাশ-সেপটিক": 2,

  "ফ্লাশ-অন্যান্য": 3,

  "জোড়া পিট-স্ল্যাব": 4,
  "জোড়া পিট-স্ল্যাব": 4,

  "জোড়া পিট-খোলা": 5,
  "জোড়া পিট-খোলা": 5,

  "একক পিট-স্ল্যাব": 6,

  "একক পিট-খোলা": 7,

  "মানুষ দ্বারা পরিষ্কার": 8,

  "পশু দ্বারা পরিষ্কার": 9,

  "খোলা নর্দমা": 0,
};

/* ============================================================
   Q22 WASTE WATER
   ============================================================ */

const WASTE_WATER_CODES = {
  "বন্ধ নর্দমা": 1,

  "খোলা নর্দমা": 2,

  "কোনও নর্দমা নেই": 3,
  "কোনো নর্দমা নেই": 3,
};

/* ============================================================
   Q23 BATHING
   ============================================================ */

const BATHING_CODES = {
  বাথরুম: 1,

  "ছাদহীন ঘেরা স্থান": 2,

  নেই: 3,
};

/* ============================================================
   Q24 KITCHEN / GAS
   ============================================================ */

const KITCHEN_CODES = {
  "রান্নাঘর + গ্যাস": 1,
  "রান্নাঘর এবং গ্যাস": 1,

  "রান্নাঘর, গ্যাস নেই": 2,

  "ঘরের ভিতর + গ্যাস": 3,

  "ঘরের ভিতর, গ্যাস নেই": 4,

  "বাইরে + গ্যাস": 5,

  "বাইরে, গ্যাস নেই": 6,

  "রান্না হয় না": 7,
  "রান্না হয় না": 7,
};

/* ============================================================
   Q25 FUEL
   ============================================================ */

const FUEL_CODES = {
  "জ্বালানি কাঠ": 1,
  কাঠ: 1,

  "ফসলের অবশিষ্টাংশ": 2,

  "গোবরের ঘুঁটে": 3,
  গোবর: 3,

  কয়লা: 4,
  কয়লা: 4,
  কাঠকয়লা: 4,

  কেরোসিন: 5,

  "রান্নার গ্যাস": 6,
  এলপিজি: 6,
  "এলপিজি/পিএনজি": 6,

  বিদ্যুৎ: 7,

  বায়োগ্যাস: 8,
  বায়োগ্যাস: 8,

  "সৌর শক্তি": 9,
  সৌরশক্তি: 9,

  অন্যান্য: 0,
};

/* ============================================================
   Q26 RADIO
   ============================================================ */

const RADIO_CODES = {
  রেডিও: 1,
  ট্রানজিস্টর: 1,

  মোবাইল: 2,
  মোবাইলে: 2,

  "অন্যান্য ডিভাইস": 3,

  নেই: 4,
};

/* ============================================================
   Q27 TV
   ============================================================ */

const TV_CODES = {
  "ডিডি ফ্রি ডিশ": 1,

  "অন্যান্য ডিটিএইচ": 2,

  কেবল: 3,

  অন্যান্য: 4,

  নেই: 5,
};

/* ============================================================
   Q28 INTERNET
   ============================================================ */

const INTERNET_CODES = {
  ল্যাপটপ: 1,
  কম্পিউটার: 1,
  "ল্যাপটপ/কম্পিউটার": 1,

  মোবাইল: 2,
  স্মার্টফোন: 2,

  "অন্যান্য ডিভাইস": 3,

  নেই: 4,
};

/* ============================================================
   Q29 LAPTOP
   ============================================================ */

const LAPTOP_CODES = {
  হ্যাঁ: 1,
  yes: 1,

  না: 2,
  no: 2,
};

/* ============================================================
   Q30 MOBILE
   ============================================================ */

const MOBILE_CODES = {
  ল্যান্ডলাইন: 1,

  স্মার্টফোন: 2,

  "সাধারণ মোবাইল": 3,
  "বেসিক মোবাইল": 3,

  উভয়: 4,
  উভয়: 4,

  নেই: 5,
};

/* ============================================================
   Q31 TWO WHEELER
   ============================================================ */

const TWO_WHEELER_CODES = {
  সাইকেল: 1,

  স্কুটার: 2,
  মোটরসাইকেল: 2,
  মোপেড: 2,

  উভয়: 3,
  উভয়: 3,

  নেই: 4,
};

/* ============================================================
   Q32 CAR
   ============================================================ */

const CAR_CODES = {
  হ্যাঁ: 1,
  yes: 1,

  না: 2,
  no: 2,
};

/* ============================================================
   Q33 FOOD GRAIN
   ============================================================ */

const GRAIN_CODES = {
  চাল: 1,
  ভাত: 1,

  গম: 2,

  জোয়ার: 3,
  জোয়ার: 3,

  বাজরা: 4,

  ভুট্টা: 5,

  অন্যান্য: 6,
};

/* ============================================================
   COLUMN DEFINITIONS

   These are deliberately compact so all 34 columns fit
   across A4 landscape.

   Q11 and Q34 are wider because they contain text/mobile.
   ============================================================ */

const columns = [
  { id: 1, label: "লাইন\nনম্বর", w: 4.0 },
  { id: 2, label: "বাড়ির\nনম্বর", w: 3.5 },
  { id: 3, label: "সেন্সাস\nঘর নম্বর", w: 4.0 },

  { id: 4, label: "মেঝে", w: 2.3 },
  { id: 5, label: "দেওয়াল", w: 2.3 },
  { id: 6, label: "ছাদ", w: 2.3 },

  { id: 7, label: "ঘরের\nব্যবহার", w: 3.8 },

  { id: 8, label: "অবস্থা", w: 2.4 },

  { id: 9, label: "পরিবারের\nসংখ্যা", w: 3.2 },

  { id: 10, label: "সদস্য\nসংখ্যা", w: 3.0 },

  { id: 11, label: "গৃহপ্রধানের নাম", w: 8.0 },

  { id: 12, label: "লিঙ্গ", w: 2.3 },
  { id: 13, label: "জাতি", w: 2.3 },
  { id: 14, label: "মালিকানা", w: 3.0 },
  { id: 15, label: "ঘর\nসংখ্যা", w: 2.5 },
  { id: 16, label: "বিবাহিত\nদম্পতি", w: 3.0 },

  { id: 17, label: "পানীয় জলের\nউৎস", w: 3.4 },
  { id: 18, label: "জলের\nঅবস্থান", w: 3.0 },
  { id: 19, label: "আলোর\nউৎস", w: 2.7 },
  { id: 20, label: "শৌচালয়\nব্যবস্থা", w: 3.0 },
  { id: 21, label: "শৌচালয়ের\nধরন", w: 3.0 },
  { id: 22, label: "বর্জ্য জল", w: 2.7 },
  { id: 23, label: "স্নানের\nব্যবস্থা", w: 2.8 },
  { id: 24, label: "রান্নার\nব্যবস্থা", w: 3.0 },
  { id: 25, label: "প্রধান\nজ্বালানি", w: 3.0 },

  { id: 26, label: "রেডিও", w: 2.5 },
  { id: 27, label: "টিভি", w: 2.5 },
  { id: 28, label: "ইন্টারনেট", w: 2.7 },
  { id: 29, label: "ল্যাপটপ", w: 2.5 },
  { id: 30, label: "মোবাইল/\nটেলিফোন", w: 3.0 },
  { id: 31, label: "সাইকেল/\nদুই-চাকা", w: 3.0 },
  { id: 32, label: "চার-চাকা", w: 2.5 },
  { id: 33, label: "প্রধান\nখাদ্যশস্য", w: 2.8 },

  { id: 34, label: "মোবাইল নম্বর", w: 8.0 },
];

/* ============================================================
   TABLE HEADER
   ============================================================ */

function TableHeader() {
  return (
    <View style={styles.tableHeader}>
      {columns.map((column) => (
        <View
          key={column.id}
          style={[
            styles.headerCell,
            {
              width: `${column.w}%`,
            },
          ]}
        >
          <Text style={styles.questionNo}>{column.id}</Text>

          <Text style={styles.headerText}>{column.label}</Text>
        </View>
      ))}
    </View>
  );
}

/* ============================================================
   RECORD VALUE PREPARATION
   ============================================================ */

function prepareRecord(r, globalIndex) {
  return {
    1: r.lineNumber ?? r.lineNo ?? String(globalIndex + 1).padStart(3, "0"),

    2: r.buildingNo ?? "",

    3: r.censusNo ?? "",

    4: getCode(r.floorMaterial, FLOOR_CODES),

    5: getCode(r.wallMaterial, WALL_CODES),

    6: getCode(r.roofMaterial, ROOF_CODES),

    7: getCode(r.houseUse, HOUSE_USE_CODES),

    8: getCode(r.houseCondition, CONDITION_CODES),

    9: r.familyCount ?? r.householdCount ?? 1,

    10: r.householdMembers ?? "",

    11: r.headName ?? "",

    12: getCode(r.headSex ?? r.sex, SEX_CODES),

    13: getCode(r.casteCategory ?? r.caste, CASTE_CODES),

    14: getCode(r.houseOwnership, OWNERSHIP_CODES),

    15: r.roomCount ?? "",

    16: r.marriedCouples ?? "",

    17: getCode(r.drinkingWaterSource, WATER_CODES),

    18: getCode(r.drinkingWaterLocation, WATER_LOCATION_CODES),

    19: getCode(r.lightingSource, LIGHTING_CODES),

    20: getCode(r.latrineAvailability, LATRINE_ACCESS_CODES),

    21: getCode(r.latrineType, LATRINE_TYPE_CODES),

    22: getCode(r.wasteWaterDrain, WASTE_WATER_CODES),

    23: getCode(r.bathingArrangement, BATHING_CODES),

    24: getCode(
      r.cookingGas ?? r.kitchenLpg ?? r.kitchenAvailability,
      KITCHEN_CODES,
    ),

    25: getCode(r.cookingFuel, FUEL_CODES),

    26: getCode(r.radio, RADIO_CODES),

    27: getCode(r.television, TV_CODES),

    28: getCode(r.internet, INTERNET_CODES),

    29: getCode(r.laptopComputer, LAPTOP_CODES),

    30: getCode(r.mobilePhoneType ?? r.mobilePhone, MOBILE_CODES),

    31: getCode(r.bicycleVehicle, TWO_WHEELER_CODES),

    32: getCode(r.carVan, CAR_CODES),

    33: getCode(r.mainFoodGrain, GRAIN_CODES),

    34: r.headMobile ?? r.mobileNumber ?? "",
  };
}

/* ============================================================
   DATA ROW
   ============================================================ */

function CensusRow({ record, index, globalIndex }) {
  const values = prepareRecord(record, globalIndex);

  return (
    <View
      style={[
        styles.dataRow,
        {
          backgroundColor: index % 2 === 0 ? "#ffffff" : "#fffdf7",
        },
      ]}
    >
      {columns.map((column) => {
        const value = values[column.id];

        const isName = column.id === 11;

        const isMobile = column.id === 34;

        const isLongText = isName || isMobile;

        return (
          <View
            key={column.id}
            style={[
              styles.dataCell,
              {
                width: `${column.w}%`,
              },
            ]}
          >
            <Text
              style={[
                styles.dataText,
                isLongText && styles.longDataText,
                !isLongText && styles.codeText,
              ]}
            >
              {value === null || value === undefined ? "" : String(value)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

/* ============================================================
   LEGEND BOX
   ============================================================ */

function LegendBox({ title, items, width = "20%" }) {
  return (
    <View
      style={[
        styles.legendBox,
        {
          width,
        },
      ]}
    >
      <Text style={styles.legendTitle}>{title}</Text>

      <View style={styles.legendContent}>
        {items.map((item, index) => (
          <Text key={index} style={styles.legendItem}>
            {item[0]} — {item[1]}
          </Text>
        ))}
      </View>
    </View>
  );
}

/* ============================================================
   LEGENDS FROM THE SHEET
   ============================================================ */

function Legends() {
  return (
    <View style={styles.legendsArea}>
      <LegendBox
        title="৪  মেঝে"
        width="12%"
        items={[
          ["1", "মাটি"],
          ["2", "কাঠ/বাঁশ"],
          ["3", "পোড়া ইট"],
          ["4", "পাথর"],
          ["5", "সিমেন্ট"],
          ["6", "মোজাইক/ফ্লোর টাইলস"],
          ["7", "অন্যান্য"],
        ]}
      />

      <LegendBox
        title="৫  দেওয়াল"
        width="13%"
        items={[
          ["1", "ঘাস/খড়/বাঁশ"],
          ["2", "প্লাস্টিক/পলিথিন"],
          ["3", "মাটি/কাঁচা ইট"],
          ["4", "কাঠ"],
          ["5", "পাথর"],
          ["6", "পাকা পাথর"],
          ["7", "জিআই/মেটাল/অ্যাসবেস্টস"],
          ["8", "পোড়া ইট"],
          ["9", "কংক্রিট"],
          ["0", "অন্যান্য"],
        ]}
      />

      <LegendBox
        title="৬  ছাদ"
        width="13%"
        items={[
          ["1", "ঘাস/খড়/বাঁশ/কাঠ/মাটি"],
          ["2", "প্লাস্টিক/পলিথিন"],
          ["3", "দেশি/হাত তৈরি টালি"],
          ["4", "মেশিন তৈরি টালি"],
          ["5", "পোড়া ইট"],
          ["6", "পাথর"],
          ["7", "স্লেট"],
          ["8", "জিআই/মেটাল/অ্যাসবেস্টস"],
          ["9", "কংক্রিট"],
          ["0", "অন্যান্য"],
        ]}
      />

      <LegendBox
        title="৭  ঘরের ব্যবহার"
        width="14%"
        items={[
          ["1", "বাসগৃহ"],
          ["2", "বাসগৃহ-সহ অন্যান্য"],
          ["3", "দোকান/অফিস"],
          ["4", "স্কুল/কলেজ"],
          ["5", "হোটেল/লজ"],
          ["6", "হাসপাতাল/ডিসপেনসারি"],
          ["7", "কারখানা/কর্মশালা"],
          ["8", "ধর্মীয় স্থান"],
          ["9", "অন্যান্য"],
          ["0", "খালি"],
        ]}
      />

      <LegendBox
        title="১৭  পানীয় জলের উৎস"
        width="16%"
        items={[
          ["1", "পরিশুদ্ধ কলের জল"],
          ["2", "অ-পরিশুদ্ধ কলের জল"],
          ["3", "কুয়ো"],
          ["4", "হ্যান্ড পাম্প"],
          ["5", "টিউবওয়েল/বোরওয়েল"],
          ["6", "ঝরনা"],
          ["7", "নদী/খাল"],
          ["8", "পুকুর/ট্যাংক/হ্রদ"],
          ["9", "বোতলজাত জল"],
          ["0", "অন্যান্য"],
        ]}
      />

      <LegendBox
        title="২৫  রান্নার প্রধান জ্বালানি"
        width="14%"
        items={[
          ["1", "জ্বালানি কাঠ"],
          ["2", "ফসলের অবশিষ্টাংশ"],
          ["3", "গোবরের ঘুঁটে"],
          ["4", "কয়লা/কাঠকয়লা"],
          ["5", "কেরোসিন"],
          ["6", "LPG/PNG"],
          ["7", "বিদ্যুৎ"],
          ["8", "বায়োগ্যাস"],
          ["9", "সৌরশক্তি"],
          ["0", "অন্যান্য"],
        ]}
      />

      <LegendBox
        title="৩০  টেলিফোন/মোবাইল"
        width="10%"
        items={[
          ["1", "ল্যান্ডলাইন"],
          ["2", "স্মার্টফোন"],
          ["3", "সাধারণ মোবাইল"],
          ["4", "উভয়"],
          ["5", "নেই"],
        ]}
      />
    </View>
  );
}

/* ============================================================
   HEADER
   ============================================================ */

function SheetHeader({ pageNumber, totalPages }) {
  // pageNumber is zero-based
  // PDF page 1 = pageNumber 0
  const actualPage = pageNumber + 1;

  const side = actualPage % 2 === 1 ? "SIDE-A" : "SIDE-B";

  return (
    <View>
      <View style={styles.topHeader}>
        <View style={styles.headerBlack}>
          <Text style={styles.headerBlackText}>ভারতের জনগণনা ২০২৭</Text>
        </View>

        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText}>
            গৃহতালিকা প্রস্তুতকরণ ও গৃহগণনার প্রশ্নাবলী
          </Text>
        </View>

        <View style={styles.sideBox}>
          <Text style={styles.sideText}>{side}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>রাজ্য / কেন্দ্রশাসিত অঞ্চল</Text>

          <Text style={styles.metaValue}></Text>
        </View>

        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>জেলা</Text>

          <Text style={styles.metaValue}></Text>
        </View>

        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>ব্লক / পৌরসভা</Text>

          <Text style={styles.metaValue}></Text>
        </View>

        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>গণনাকারী</Text>

          <Text style={styles.metaValue}></Text>
        </View>

        <View
          style={[
            styles.metaItem,
            {
              width: "15%",
            },
          ]}
        >
          <Text style={styles.metaLabel}>পৃষ্ঠা</Text>

          <Text style={styles.metaValue}>
            {actualPage} / {totalPages}
          </Text>
        </View>
      </View>
    </View>
  );
}

/* ============================================================
   PAGE
   ============================================================ */

function SideBPage({ records, pageNumber, totalPages }) {
  const side = (pageNumber + 1) % 2 === 1 ? "SIDE-A" : "SIDE-B";
  return (
    <Page size="A4" orientation="landscape" style={styles.page} wrap={false}>
      <SheetHeader pageNumber={pageNumber} totalPages={totalPages} />

      {/* Main table */}

      <View style={styles.table}>
        <TableHeader />

        {records.map((record, index) => (
          <CensusRow
            key={record?.docId || record?.id || `${pageNumber}-${index}`}
            record={record}
            index={index}
            globalIndex={pageNumber * 10 + index}
          />
        ))}

        {/* Fill blank rows when last page has fewer than 10 */}

        {Array.from({
          length: 10 - records.length,
        }).map((_, index) => (
          <CensusRow
            key={`blank-${index}`}
            record={{}}
            index={records.length + index}
            globalIndex={pageNumber * 10 + records.length + index}
          />
        ))}
      </View>

      {/* Legends */}

      <Legends />

      {/* Footer */}

      <View style={styles.footer}>
        <Text>Census 2027 — Houselisting & Housing Census</Text>

        <Text>{side}</Text>

        <Text>
          Page {pageNumber + 1} of {totalPages}
        </Text>
      </View>
    </Page>
  );
}

/* ============================================================
   DOCUMENT

   *** THIS IS THE IMPORTANT PART ***

   The array is divided into chunks of 10.

   It does NOT do:

       records.map(record => <Page>...</Page>)

   Instead:

       records.slice(0, 10)    → Page 1
       records.slice(10, 20)   → Page 2
       records.slice(20, 30)   → Page 3

   Therefore each page contains 10 rows.
   ============================================================ */

export function Census2027SideBDocument({ records = [] }) {
  const pages = [];

  for (let i = 0; i < records.length; i += 10) {
    pages.push(records.slice(i, i + 10));
  }

  return (
    <Document
      title="Census 2027 Data Sheet"
      author="Census 2027"
      subject="Houselisting and Housing Census"
    >
      {pages.map((pageRecords, index) => (
        <SideBPage
          key={index}
          records={pageRecords}
          pageNumber={index}
          totalPages={pages.length}
        />
      ))}
    </Document>
  );
}

/* ============================================================
   DOWNLOAD FUNCTION
   ============================================================ */

export async function downloadCensusSideB(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("No Census records available.");
  }

  const blob = await pdf(
    <Census2027SideBDocument records={records} />,
  ).toBlob();

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;

  link.download = `Census-2027-Data-Sheet-${records.length}-records.pdf`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/* ============================================================
   DOWNLOAD BUTTON
   ============================================================ */

export function Census2027DataSheetDownloadButton({
  records = [],
  className = "",
}) {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!Array.isArray(records) || records.length === 0) {
      alert("কোনও Census record পাওয়া যায়নি।");

      return;
    }

    try {
      setLoading(true);

      await downloadCensusSideB(records);
    } catch (error) {
      console.error("Census Data Sheet PDF error:", error);

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
      className={`rounded-lg bg-green-700 px-5 py-3 font-bold text-white shadow hover:bg-green-800 disabled:opacity-60 ${className}`}
    >
      {loading
        ? "PDF তৈরি হচ্ছে..."
        : `📄 Data Sheet PDF (${records.length} records)`}
    </button>
  );
}

/* ============================================================
   STYLES
   ============================================================ */

const styles = StyleSheet.create({
  page: {
    paddingTop: 10,
    paddingBottom: 8,
    paddingLeft: 10,
    paddingRight: 10,

    fontFamily: "NotoSansBengali",

    fontSize: 5.2,

    color: "#111111",

    backgroundColor: "#ffffff",
  },

  /* --------------------------------------------------------
       HEADER
       -------------------------------------------------------- */

  topHeader: {
    height: 28,

    flexDirection: "row",

    borderTop: "1 solid #222",

    borderBottom: "1 solid #222",

    alignItems: "center",
  },

  headerBlack: {
    width: "17%",

    height: 27,

    backgroundColor: "#202020",

    justifyContent: "center",

    paddingLeft: 6,
  },

  headerBlackText: {
    color: "#ffffff",

    fontSize: 11,

    fontWeight: "bold",
  },

  headerTitle: {
    width: "73%",

    paddingLeft: 8,
  },

  headerTitleText: {
    fontSize: 10,

    fontWeight: "bold",
  },

  sideBox: {
    width: "10%",

    height: 27,

    borderLeft: "1 solid #222",

    justifyContent: "center",

    alignItems: "center",
  },

  sideText: {
    fontSize: 10,

    fontWeight: "bold",
  },

  /* --------------------------------------------------------
       META
       -------------------------------------------------------- */

  metaRow: {
    height: 27,

    flexDirection: "row",

    borderBottom: "0.8 solid #444",
  },

  metaItem: {
    width: "17%",

    flexDirection: "row",

    alignItems: "center",

    borderRight: "0.5 solid #777",
  },

  metaLabel: {
    width: "48%",

    fontSize: 4.2,

    fontWeight: "bold",

    paddingLeft: 2,
  },

  metaValue: {
    width: "52%",

    fontSize: 5.5,

    borderBottom: "0.5 solid #888",

    minHeight: 13,

    paddingLeft: 2,
  },

  /* --------------------------------------------------------
       TABLE
       -------------------------------------------------------- */

  table: {
    width: "100%",

    borderLeft: "0.7 solid #333",

    borderTop: "0.7 solid #333",

    borderRight: "0.7 solid #333",
  },

  tableHeader: {
    height: 72,

    flexDirection: "row",

    backgroundColor: "#fffdf6",
  },

  headerCell: {
    height: 72,

    borderRight: "0.45 solid #999",

    borderBottom: "0.7 solid #333",

    position: "relative",

    alignItems: "center",

    justifyContent: "flex-end",

    paddingBottom: 3,
  },

  questionNo: {
    position: "absolute",

    top: 2,

    left: 0,

    right: 0,

    textAlign: "center",

    fontSize: 5,

    fontWeight: "bold",

    backgroundColor: "#222",

    color: "#fff",

    paddingTop: 1,

    paddingBottom: 1,
  },

  headerText: {
    fontSize: 4.1,

    lineHeight: 1.05,

    textAlign: "center",

    width: "95%",

    transform: "rotate(-90deg)",

    marginBottom: 12,
  },

  /* --------------------------------------------------------
       DATA ROW
       -------------------------------------------------------- */

  dataRow: {
    height: 29,

    flexDirection: "row",

    borderBottom: "0.55 solid #888",
  },

  dataCell: {
    height: 29,

    borderRight: "0.45 solid #999",

    justifyContent: "center",

    alignItems: "center",

    paddingLeft: 1,

    paddingRight: 1,

    overflow: "hidden",
  },

  dataText: {
    fontSize: 5.3,

    lineHeight: 1,

    textAlign: "center",

    fontFamily: "NotoSansBengali",
  },

  codeText: {
    fontSize: 6.2,

    fontWeight: "bold",
  },

  longDataText: {
    fontSize: 5.1,

    textAlign: "center",
  },

  /* --------------------------------------------------------
       LEGENDS
       -------------------------------------------------------- */

  legendsArea: {
    height: 112,

    marginTop: 4,

    flexDirection: "row",

    borderTop: "0.7 solid #555",

    borderLeft: "0.7 solid #555",

    borderBottom: "0.7 solid #555",
  },

  legendBox: {
    height: 112,

    backgroundColor: "#fff2d5",

    borderRight: "0.6 solid #999",

    padding: 3,
  },

  legendTitle: {
    fontSize: 5.5,

    fontWeight: "bold",

    marginBottom: 2,

    borderBottom: "0.5 solid #777",

    paddingBottom: 2,
  },

  legendContent: {
    flexDirection: "column",
  },

  legendItem: {
    fontSize: 4.1,

    lineHeight: 1.15,

    marginBottom: 1,
  },

  /* --------------------------------------------------------
       FOOTER
       -------------------------------------------------------- */

  footer: {
    height: 13,

    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    fontSize: 4.5,

    color: "#555",
  },
});

export default Census2027DataSheetDownloadButton;
