import axios from 'axios'
import { useState, useEffect } from 'react'

const CardPage = ({ card }) => {
  const [promotion, setPromotion] = useState('Loading...')
  useEffect(() => {
    if (!card){
      return 'Error'
    }

    const fetchPromotion = async () => {
      try {
        const response = await axios.get(
          `https://api.browse.ai/v2/robots/${card}/tasks`,
          {
            headers: {
              Authorization: `Bearer ${import.meta.env.VITE_ROBOT_API_KEY}`
            }
          }
        )
        const promo =
          response.data?.result?.robotTasks?.items?.[0]?.capturedTexts?.Promotion ||
          'No promotion found'
        setPromotion(promo)
      } catch (error) {
        console.error('Error fetching tasks:', error)
        setPromotion('Error fetching promotion')
      }
    }

    fetchPromotion()
  }, [card])

  return (
    <>
      <h2>Promotion:</h2>
      <p>{promotion}</p>
    </>
  )
}

export default CardPage
