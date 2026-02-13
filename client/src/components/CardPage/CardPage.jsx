import axios from 'axios'
import { useState, useEffect } from 'react'
import styles from './CardPage.module.css'
import ChartView from '../ChartView/ChartView'
import HistoricalDataView from '../HistoricalDataView/HistoricalDataView'

const CardPage = ({ card }) => {
  const [historicalData, setHistoricalData] = useState([])
  const [latestPromotion, setLatestPromotion] = useState('')
  const [viewMode, setViewMode] = useState('chart')

  // Fetch historical data from MongoDB
  useEffect(() => {
    if (!card) return;

    const fetchData = async () => {
      try {
        // Fetch all records for this card from MongoDB
        const response = await axios.get('/api/data?card=amex_cobalt');
        const records = response.data;

        console.log('Fetched MongoDB records:', records);

        if (records.length === 0) {
          setLatestPromotion('No data available yet. Cron job will populate data daily.');
          return;
        }

        // Set the latest promotion text
        const latestRecord = records[records.length - 1];
        setLatestPromotion(`Latest data from ${new Date(latestRecord.date).toLocaleDateString()}`);

        // Flatten all data points from all records
        const allDataPoints = records.flatMap(record =>
          record.data.map(item => ({
            ...item,
            recordDate: record.date
          }))
        );

        setHistoricalData(allDataPoints)

      } catch (error) {
        console.error('Error fetching data:', error);
        setLatestPromotion('Error fetching data');
      }
    };

    fetchData();
  }, [card]);

  return (
    <>
      <h2>Amex Cobalt - Points History</h2>
      <p>{latestPromotion}</p>

      {/* View Toggle Buttons */}
      <div className={styles.toggleContainer}>
        <button
          onClick={() => setViewMode('chart')}
          className={viewMode === 'chart' ? styles.toggleButtonActive : styles.toggleButton}
        >
          Chart View
        </button>
        <button
          onClick={() => setViewMode('data')}
          className={viewMode === 'data' ? styles.toggleButtonActive : styles.toggleButton}
        >
          All Data View
        </button>
      </div>

      {viewMode === 'chart' && <ChartView historicalData={historicalData} />}
      {viewMode === 'data' && <HistoricalDataView historicalData={historicalData} />}
    </>
  )
}

export default CardPage
