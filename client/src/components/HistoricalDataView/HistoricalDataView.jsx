import styles from './HistoricalDataView.module.css'

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
}

const HistoricalDataView = ({ historicalData }) => {
  if (!historicalData || historicalData.length === 0) {
    return null
  }

  return (
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
