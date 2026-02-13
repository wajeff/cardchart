import axios from 'axios'
import { useState, useEffect } from 'react'
import { Chart } from 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import styles from './CardPage.module.css';

const CardPage = ({ card }) => {
  const [historicalData, setHistoricalData] = useState([]);
  const [latestPromotion, setLatestPromotion] = useState('');
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'data'

  // Field name formatting
  const fieldLabels = {
    totalPoints: 'Total Points',
    totalSpendRequired: 'Total Spend Required',
    monthlySpendRequired: 'Monthly Spend Required',
    monthlyPoints: 'Monthly Points',
    promotionDurationMonths: 'Promotion Duration (Months)',
    totalMembershipFee: 'Total Membership Fee',
    monthlyFee: 'Monthly Fee',
    dataGatheredAt: 'Data Gathered At',
    promotionText: 'Promotion Text',
    recordDate: 'Record Date'
  };

  // Fetch historical data from MongoDB
  useEffect(() => {
    if (!card) return;

    const fetchData = async () => {
      try {
        // Fetch all records for this card from MongoDB
        const response = await axios.get('http://localhost:3001/api/data?card=amex_cobalt');
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

        setHistoricalData(allDataPoints);

      } catch (error) {
        console.error('Error fetching data:', error);
        setLatestPromotion('Error fetching data');
      }
    };

    fetchData();
  }, [card]);

  // Render chart when data is available or view changes
  useEffect(() => {
    if (!historicalData || historicalData.length === 0 || viewMode !== 'chart') return;

    const canvas = document.getElementById('cardChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart if it exists
    const existingChart = Chart.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }

    new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'Total Points',
          data: historicalData.map(item => ({
            x: new Date(item.dataGatheredAt),
            y: item.totalPoints
          })),
          borderColor: 'rgb(75, 192, 192)',
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: {
            type: 'time',
            title: {
              display: true,
              text: 'Date'
            },
            time: {
              unit: 'day'
            }
          },
          y: {
            title: {
              display: true,
              text: 'Total Points'
            }
          }
        }
      }
    });

  }, [historicalData, viewMode]);

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

      {/* Chart View */}
      {viewMode === 'chart' && <canvas id='cardChart'></canvas>}

      {/* All Historical Data View */}
      {viewMode === 'data' && historicalData.length > 0 && (
        <div className={styles.historicalData}>
          <h3>All Historical Data</h3>
          {historicalData.map((item, idx) => (
            <div key={idx} className={styles.recordCard}>
              <h4>
                Record #{historicalData.length - idx} - {new Date(item.dataGatheredAt).toLocaleString()}
              </h4>

              <div className={styles.fieldGrid}>
                {Object.entries(item)
                  .filter(([key]) => key !== 'promotionText' && key !== '_id' && key !== 'recordDate')
                  .map(([key, value]) => (
                    <div key={key} className={styles.fieldItem}>
                      <strong>{fieldLabels[key] || key}:</strong>{' '}
                      {key === 'dataGatheredAt'
                        ? new Date(value).toLocaleString()
                        : key.includes('Fee') || key.includes('Spend') || key.includes('Points')
                          ? (key.includes('Fee') || key.includes('Spend') ? `$${value}` : value)
                          : value
                      }
                    </div>
                  ))
                }
              </div>

              {item.promotionText && (
                <div className={styles.promotionText}>
                  <strong>{fieldLabels.promotionText}:</strong>
                  <pre className={styles.promotionPre}>
                    {item.promotionText}
                  </pre>
                </div>
              )}
            </div>
          )).reverse()}
        </div>
      )}
    </>
  )
}

export default CardPage
