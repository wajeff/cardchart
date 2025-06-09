import axios from 'axios'
import { useState, useEffect } from 'react'
import { GoogleGenAI } from "@google/genai";
import { Chart } from 'chart.js/auto';
import 'chartjs-adapter-date-fns';

const CardPage = ({ card }) => {
  const [promotion, setPromotion] = useState('')
  const [data, setData] = useState([]);
                                                  /* CARD DATA WEB SCRAPING */
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
        console.log(response.data)
        console.log(response.data?.result?.robotTasks?.items?.[2].finishedAt)
        const promo =
          `${response.data?.result?.robotTasks?.items?.[2]?.capturedTexts?.Promotion} Data was gathered at ${response.data?.result?.robotTasks?.items?.[2].finishedAt}` ||
          'No promotion found'
        setPromotion(promo)
      } catch (error) {
        console.error('Error fetching tasks:', error)
        setPromotion('Error fetching promotion')
      }
    }
    
    fetchPromotion()
  }, [card])

  
                                                  /* CARD DATA AI PARSING */

                                                  
useEffect(()=>{
  if (
    !promotion
  ) return;
  const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
 
  async function main() {
    await new Promise(resolve => setTimeout(resolve, 1000))
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents:
        `${promotion} please fill out membership fee to its exact amount - you always forget the decimal point IT IS NOT 15588, DOUBLE CHECK. please fill out when the data was gathered (it's in the last sentence), do not respond if not all of the array has been finished`, 
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
            dataGatheredAt:{
              type: "integer",
            }
          },   
        },
        },
      //Bugged, Gemini does not return in correct ordering
      propertyOrdering: ["totalPoints", "totalSpendRequired","totalMembershipFee","dataGatheredAt"],
      },
    });
  setData(JSON.parse(response.text));
  console.log(response.text)
  // console.log(data)
  // console.log(data[0])
  data.forEach((item)=>console.log(item))
  }
  
  main()
  },[promotion]);


                                                    /* CHART */


  useEffect(() => {
  if (!data || data.length === 0) return;

  async function chart() {
    await new Promise(resolve => setTimeout(resolve, 1000));

    const canvas = document.getElementById('cardChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    new Chart(ctx, {
      type: 'line',
      data: {
        datasets: [{
          label: 'History',
          data: data.map(item => ({
            x: new Date(item.dataGatheredAt),      
            y: item.totalPoints
          }))
        }]
      },
      options: {
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
  }

  chart();
}, [data]);


  
  
  return (
    <>
      <h2>Promotion:</h2>
      <p>{promotion}</p>
      <canvas id='cardChart'></canvas>
    </>
  )
}

export default CardPage
