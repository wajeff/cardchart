import styles from './HistoricalDataView.module.css'

const fieldLabels = {
  totalPoints: 'Total Points',
  totalSpendRequired: 'Total Spend Required',
  monthlySpendRequired: 'Monthly Spend Required',
  promotionDurationMonths: 'Promotion Duration (Months)',
  totalMembershipFee: 'Total Membership Fee',
  dataGatheredAt: 'Data Gathered At',
  promotionText: 'Promotion Text',
  recordDate: 'Record Date'
}

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

const formatInteger = (value) => {
  const numericValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(numericValue)) {
    return value
  }
  return numericValue.toLocaleString('en-US')
}

const formatValue = (key, value) => {
  if (key === 'dataGatheredAt') {
    return toDate(value)?.toLocaleString() || 'Unknown date'
  }

  if (key.includes('Fee') || key.includes('Spend')) {
    return `$${formatInteger(value)}`
  }

  if (key.includes('Points')) {
    return formatInteger(value)
  }

  return value
}

const HistoricalDataView = ({ historicalData }) => {
  if (!historicalData || historicalData.length === 0) {
    return null
  }

  const sortedHistoricalData = [...historicalData].sort((a, b) => {
    const dateA = toDate(a.dataGatheredAt)
    const dateB = toDate(b.dataGatheredAt)

    if (!dateA && !dateB) return 0
    if (!dateA) return 1
    if (!dateB) return -1
    return dateB - dateA
  })

  return (
    <div className={styles.historicalData}>
      <h3>All Historical Data</h3>
      {sortedHistoricalData.map((item, idx) => (
        <div key={idx} className={styles.recordCard}>
          <h4>
            Record #{idx + 1} - {toDate(item.dataGatheredAt)?.toLocaleString() || 'Unknown date'}
          </h4>

          <div className={styles.fieldGrid}>
            {Object.entries(item)
              .filter(([key]) => key !== 'promotionText' && key !== '_id' && key !== 'recordDate' && key !== 'monthlyPoints' && key !== 'monthlyFee')
              .map(([key, value]) => (
                <div key={key} className={styles.fieldItem}>
                  <strong>{fieldLabels[key] || key}:</strong>{' '}
                  {formatValue(key, value)}
                </div>
              ))}
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
      ))}
    </div>
  )
}

export default HistoricalDataView
