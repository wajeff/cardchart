"use client";

import axios from "axios";
import { useState, useEffect } from "react";
import styles from "./CardPage.module.css";
import ChartView from "../ChartView/ChartView";
import AlertsSignup from "../AlertsSignup/AlertsSignup";
import cardAssets from "../../cardAssets";
import cardValues from "../../cardValues";
import { Skeleton } from "@/components/ui/skeleton";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }

  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "development" ? "http://localhost:3001" : "";
  }

  const { protocol, hostname } = window.location;

  if (process.env.NODE_ENV === "development") {
    return `${protocol}//${hostname}:3001`;
  }

  return "";
};

function cleanCardName(input) {
  let string = String(input)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ");

  return string
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const toDate = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalizeEpoch = (num) => {
    return Math.abs(num) < 1e12 ? num * 1000 : num;
  };

  if (typeof value === "string") {
    const numericValue = Number(value);
    const parsed = Number.isNaN(numericValue)
      ? new Date(value)
      : new Date(normalizeEpoch(numericValue));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed =
    typeof value === "number"
      ? new Date(normalizeEpoch(value))
      : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getNewYorkDateString = () =>
  new Date().toLocaleDateString("en-US", { timeZone: "America/New_York" });

const sanitizePointValueInput = (value) => {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [whole = "", ...rest] = cleaned.split(".");
  const decimal = rest.join("").slice(0, 2);

  if (rest.length === 0) {
    return cleaned;
  }

  return `${whole}.${decimal}`;
};

const parseNumericValue = (value) => {
  const parsed = Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) =>
  new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const CardPage = ({ card }) => {
  const cardImg = cardAssets[card];
  const [historicalData, setHistoricalData] = useState([]);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [latestDataText, setLatestDataText] = useState(
    `Latest data from ${getNewYorkDateString()}`,
  );
  const [lastPromotionChangeText, setLastPromotionChangeText] = useState("");
  const [viewMode, setViewMode] = useState("chart");
  const [inputValue, setInputValue] = useState(
    String(cardValues[card]?.value ?? ""),
  );

  const minimumPointValue = parseNumericValue(inputValue);
  const latestPointAmount =
    historicalData.length > 0
      ? parseNumericValue(historicalData[historicalData.length - 1]?.totalPoints)
      : null;
  const currentPointsValue =
    latestPointAmount !== null ? (latestPointAmount * minimumPointValue) / 100 : null;

  useEffect(() => {
    setInputValue(String(cardValues[card]?.value ?? ""));
  }, [card]);

  // Fetch historical data from MongoDB
  useEffect(() => {
    if (!card) return;

    const fetchData = async () => {
      setIsLoadingChart(true);
      try {
        setLatestDataText(`Latest data from ${getNewYorkDateString()}`);

        // Fetch all records for this card from MongoDB
        const response = await axios.get(`${getApiBaseUrl()}/api/data`, {
          params: { card },
        });
        const records = response.data;

        console.log("Fetched MongoDB records:", records);

        if (records.length === 0) {
          setHistoricalData([]);
          setLastPromotionChangeText(
            "Last promotion change unavailable (no data yet).",
          );
          return;
        }

        // Set the last promotion change text from latest record date
        const latestRecord = records[records.length - 1];
        const latestDate = toDate(latestRecord.date);
        setLastPromotionChangeText(
          latestDate
            ? `Last promotion change ${latestDate.toLocaleDateString()}`
            : "Last promotion change date unavailable",
        );

        // Flatten all data points from all records
        const allDataPoints = records.flatMap((record) =>
          record.data.map((item) => ({
            ...item,
            recordDate: record.date,
          })),
        );

        setHistoricalData(allDataPoints);
      } catch (error) {
        console.error("Error fetching data:", error);
        setHistoricalData([]);
        setLastPromotionChangeText("Error fetching data");
      } finally {
        setIsLoadingChart(false);
      }
    };

    fetchData();
  }, [card]);

  return (
    <div className={styles.cardPageBody}>
      <div className={styles.headingBlock}>
        <h2 className={styles.title}>{cleanCardName(card)}</h2>
        <h2 className={styles.subTitle}>Points History</h2>
      </div>

      <section className={styles.pointsContainer}>
        <div className={styles.leftContainer}>
          <div className={styles.cardImagePanel}>
            <img className={styles.cardImg} src={cardImg?.src} />
          </div>

          <Card className={`w-full ${styles.minimumValueCard}`}>
            <CardHeader className={styles.minimumValueHeader}>
              <CardTitle className="text-[1em] font-medium m-0 mx-auto">
                Minimum Promotion Value
                <br></br>
              </CardTitle>
              <CardContent className={styles.minimumValueBody}>
                <input
                  className={styles.minimumValueInput}
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9]*[.]?[0-9]*"
                  value={inputValue}
                  onChange={(e) => setInputValue(sanitizePointValueInput(e.target.value))}
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = sanitizePointValueInput(
                      e.clipboardData.getData("text"),
                    );
                    setInputValue(pasted);
                  }}
                ></input>
                <p className={styles.minimumValueAmount}>
                  {minimumPointValue} cents per point
                </p>
                <div className={styles.currentPointsValueBlock}>
                  <p className={styles.currentPointsValueLabel}>Current Points Value</p>
                  <p className={styles.currentPointsValueAmount}>
                    {currentPointsValue !== null
                      ? formatCurrency(currentPointsValue)
                      : "Unavailable"}
                  </p>
                </div>
              </CardContent>
            </CardHeader>
            <CardContent>{/* Add secondary card content here */}</CardContent>
          </Card>
        </div>

        <div className={styles.chartContainer}>
          {viewMode === "chart" && (
            <Card className={styles.chartCard}>
              <CardContent className={styles.chartCardContent}>
                {isLoadingChart ? (
                  <div className={styles.chartLoadingState}>
                    <Skeleton className={styles.chartLoadingTopBar} />
                    <Skeleton className={styles.chartLoadingCanvas} />
                    <div className={styles.chartLoadingAxisRow}>
                      <Skeleton className={styles.chartLoadingAxisLabel} />
                      <Skeleton className={styles.chartLoadingAxisLabel} />
                    </div>
                  </div>
                ) : historicalData.length > 0 ? (
                  <ChartView historicalData={historicalData} />
                ) : (
                  <div className={styles.chartEmptyState}>No chart data available.</div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className={styles.alertsContainer}>
          <AlertsSignup fullWidth className={styles.alertsSignupCard} />
        </div>

        {/* {viewMode === "data" && (
          <HistoricalDataView historicalData={historicalData} />
        )} */}
      </section>

      {/* <p>{latestDataText}</p>
      <p>{lastPromotionChangeText}</p> */}

      {/* View Toggle Buttons */}
      {/* <div className={styles.toggleContainer}>
        <button
          onClick={() => setViewMode("chart")}
          className={
            viewMode === "chart"
              ? styles.toggleButtonActive
              : styles.toggleButton
          }
        >
          Chart View
        </button>
        <button
          onClick={() => setViewMode("data")}
          className={
            viewMode === "data"
              ? styles.toggleButtonActive
              : styles.toggleButton
          }
        >
          All Data View
        </button>
      </div> */}
    </div>
  );
};

export default CardPage;
