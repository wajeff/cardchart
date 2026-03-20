import axios from "axios";
import { useState, useEffect } from "react";
import styles from "./CardPage.module.css";
import ChartView from "../ChartView/ChartView";
import HistoricalDataView from "../HistoricalDataView/HistoricalDataView";
import cardAssets from "../../cardAssets";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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

const CardPage = ({ card }) => {
  const cardImg = cardAssets[card];
  const [historicalData, setHistoricalData] = useState([]);
  const [latestDataText, setLatestDataText] = useState(
    `Latest data from ${getNewYorkDateString()}`,
  );
  const [lastPromotionChangeText, setLastPromotionChangeText] = useState("");
  const [viewMode, setViewMode] = useState("chart");

  // Fetch historical data from MongoDB
  useEffect(() => {
    if (!card) return;

    const fetchData = async () => {
      try {
        setLatestDataText(`Latest data from ${getNewYorkDateString()}`);

        // Fetch all records for this card from MongoDB
        const response = await axios.get(`/api/data?card=${card}`);
        const records = response.data;

        console.log("Fetched MongoDB records:", records);

        if (records.length === 0) {
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
        setLastPromotionChangeText("Error fetching data");
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
          <Card className='w-[400px] block'>
            <CardHeader>
              <img className={styles.cardImg} src={cardImg?.src} />
              <CardTitle className="text-[1em] font-medium m-0 mx-auto">
                Point Values
              </CardTitle>
            
            </CardHeader>

            <CardContent>
              {/*Add minimum value */}
              
            </CardContent>
            
          </Card>
        </div>

        <div className={styles.chartContainer}>
          {viewMode === "chart" && (
            <Card className={styles.chartCard}>
              <CardContent className={styles.chartCardContent}>
                <ChartView historicalData={historicalData} />
              </CardContent>
            </Card>
          )}
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
