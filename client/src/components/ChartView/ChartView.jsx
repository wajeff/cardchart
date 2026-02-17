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

const startOfDay = (date) => {
  const day = new Date(date)
  day.setHours(0, 0, 0, 0)
  return day
}

const addDays = (date, days) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

const getDayKey = (date) => (
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
)

const buildDailyStepData = (historicalData) => {
  const rawPoints = historicalData
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
    .sort((a, b) => a.x - b.x)

  if (rawPoints.length === 0) {
    return []
  }

  // Keep only the latest value for each calendar day.
  const byDay = new Map()
  rawPoints.forEach((point) => {
    byDay.set(getDayKey(startOfDay(point.x)), {
      x: startOfDay(point.x),
      y: point.y
    })
  })

  const points = Array.from(byDay.values()).sort((a, b) => a.x - b.x)
  const today = startOfDay(new Date())
  const chartData = []

  for (let i = 0; i < points.length; i += 1) {
    const current = points[i]
    const next = points[i + 1]
    const endExclusive = next ? startOfDay(next.x) : addDays(today, 1)

    for (let day = startOfDay(current.x); day < endExclusive; day = addDays(day, 1)) {
      chartData.push({
        x: new Date(day),
        y: current.y
      })
    }
  }

  return chartData
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

    const chartData = buildDailyStepData(historicalData)

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
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0
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
            },
            ticks: {
              callback: (value) => Number(value).toLocaleString('en-US')
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
