import { useEffect, useRef } from 'react'
import { Chart } from 'chart.js/auto'
import 'chartjs-adapter-date-fns'
import styles from './ChartView.module.css'

const toDate = (value) => {
  if (value === null || value === undefined) {
    return null
  }

  if (typeof value === 'string') {
    const numericValue = Number(value)
    const parsed = Number.isNaN(numericValue) ? new Date(value) : new Date(numericValue)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const ChartView = ({ historicalData }) => {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!historicalData || historicalData.length === 0) {
      return;
    }

    const canvas = canvasRef.current
    if (!canvas) {
      return;
    }

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      return;
    }

    const existingChart = Chart.getChart(canvas)
    if (existingChart) {
      existingChart.destroy()
    }

    const chartData = historicalData
      .map((item) => {
        const dateValue = toDate(item.dataGatheredAt)
        if (!dateValue) {
          return null
        }

        return {
          x: dateValue,
          y: item.totalPoints
        }
      })
      .filter(Boolean)

    if (chartData.length === 0) {
      return;
    }

    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'Total Points',
          data: chartData,
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
    })

    return () => {
      chart.destroy()
    }
  }, [historicalData])

  return <canvas ref={canvasRef} className={styles.chartCanvas}></canvas>
}

export default ChartView
