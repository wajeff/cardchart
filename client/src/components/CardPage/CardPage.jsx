import axios from 'axios'
import { useState, useEffect } from 'react'
import { Chart } from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

const CardPage = ({ card }) => {
  const [historicalData, setHistoricalData] = useState([]);
  const [latestPromotion, setLatestPromotion] = useState('');

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

  // Render chart when data is available
  useEffect(() => {
    if (!historicalData || historicalData.length === 0) return;

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

  }, [historicalData]);

  return (
    <>
      <h2>Amex Cobalt - Points History</h2>
      <p>{latestPromotion}</p>
      <canvas id='cardChart'></canvas>

      {historicalData.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Latest Data:</h3>
          <ul>
            {historicalData.slice(-1).map((item, idx) => (
              <li key={idx}>
                <strong>Points:</strong> {item.totalPoints} |
                <strong> Spend Required:</strong> ${item.totalSpendRequired} |
                <strong> Membership Fee:</strong> ${item.totalMembershipFee}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

export default CardPage
