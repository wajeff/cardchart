import axios from 'axios'
import { useState, useEffect } from 'react'
import { GoogleGenAI } from "@google/genai";


const CardPage = ({ card }) => {
  const [promotion, setPromotion] = useState('')
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
          response.data?.result?.robotTasks?.items?.[2]?.capturedTexts?.Promotion ||
          'No promotion found'
        setPromotion(promo)
      } catch (error) {
        console.error('Error fetching tasks:', error)
        setPromotion('Error fetching promotion')
      }
    }
    
    fetchPromotion()
  }, [card])


useEffect(()=>{
  if (
    !promotion ||
    promotion === 'No promotion found' ||
    promotion === 'Error fetching promotion'
  ) return;
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
 
  async function main() {
    await new Promise(resolve => setTimeout(resolve, 1000))
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents:
        `${promotion} please fill out the membership fee to its exact value`, 
      config: {
        responseMimeType: "application/json",
        responseSchema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            totalPoints: {
              type: "integer",
            },
            totalSpendRequired: {
              type: "integer",
            },
            totalMembershipFee:{
              type: "integer",
            },
          },   
        },
        },
      propertyOrdering: ["totalPoints", "totalSpendRequired","totalMembershipFee"],
      },
    });
  console.log(response.text);
  }
  main()
  },[promotion]
)
  
  
  return (
    <>
      <h2>Promotion:</h2>
      <p>{promotion}</p>
    </>
  )
}

export default CardPage
