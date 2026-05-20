import React, { useState, useEffect } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import Skeleton from '@mui/material/Skeleton';
import styles from './ComparePage.module.css';


const dummyCompareData = [
  { week: "Wk 1", app1Score: 3.25, app2Score: 3.33 },
  { week: "Wk 2", app1Score: 3.04, app2Score: 3.62 },
  { week: "Wk 3", app1Score: 2.44, app2Score: 3.50 },
  { week: "Wk 4", app1Score: 2.71, app2Score: 3.50 },
  { week: "Wk 5", app1Score: 3.00, app2Score: 2.10 }, // app2 drops hard here! Perfect talking point for an update failure.
  { week: "Wk 6", app1Score: 3.42, app2Score: 3.03 },
  { week: "Wk 7", app1Score: 2.60, app2Score: 3.25 },
  { week: "Wk 8", app1Score: 3.50, app2Score: 2.65 },
  { week: "Wk 9", app1Score: 2.80, app2Score: 2.70 },
  { week: "Wk 10", app1Score: 3.38, app2Score: 2.47 },
  { week: "Wk 11", app1Score: 3.11, app2Score: 3.38 },
  { week: "Wk 12", app1Score: 3.19, app2Score: 3.35 }
];

// Make sure to pass app1Data and app2Data as props from your parent component!
const SentimentComparison = ({ app1Data, app2Data }) => {
  const [dataset, setDataset] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  console.log("SentimentComparison received app1Data:", app1Data);
  console.log("SentimentComparison received app2Data:", app2Data);
  useEffect(() => {
    const fetchComparisonData = async () => {
      // Ensure we have both IDs before attempting to fetch
      if (!app1Data?.trackId || !app2Data?.trackId) return;

      setLoading(true);
      setError(false);

      try {
        // Fetch both analytics endpoints at the same time
        const [res1, res2] = await Promise.all([
          fetch(`http://localhost:8000/api/analytics/?trackId=${app1Data.trackId}`),
          fetch(`http://localhost:8000/api/analytics/?trackId=${app2Data.trackId}`)
        ]);

        const data1 = await res1.json();
        const data2 = await res2.json();

        // If either app returns your "No reviews found" error, trigger the fallback
        if (data1.error || data2.error) {
          setDataset(dummyCompareData);
          setIsDemoMode(true);
          return;
        }

        // Merge the two 12-bucket arrays into a single dataset for MUI Charts
        // We extract the 'movingAvg' value from your backend calculation
        const mergedData = data1.data.map((item, index) => {
          const item2 = data2.data[index] || {};
          return {
            week: item.week, // Your backend sets this to 'Wk 1' or 'Day 1'
            app1Score: item.movingAvg,
            app2Score: item2.movingAvg || null, 
          };
        });

        setDataset(mergedData);
      } catch (err) {
        console.error("Error fetching comparison analytics:", err);
        setDataset(dummyCompareData);
        setIsDemoMode(true);
        
      } finally {
        setLoading(false);
      }
    };

    fetchComparisonData();
  }, [app1Data, app2Data]);
  console.log("Dataset in SentimentComparison:", dataset);
  return (
    <div className={styles.graphBox}>
      <div className={styles.graphInformation}>
        <h4>THE QUALITY WAR: SENTIMENT OVER TIME</h4>
       
        <div className={styles.graphImage} style={{ height: '400px', width: '100%' }}>
          
          {loading ? (
            <Skeleton 
              variant="rectangular" 
              width="100%" 
              height="100%" 
              animation="wave" 
              sx={{ borderRadius: '10px' }} 
            />
          ) : 
          
          
          error || dataset.length === 0 ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#6c757d' }}>Not enough review data available to map comparison.</p>
            </div>
          ) : 
          
         
          (
            <LineChart
              dataset={dataset}
              xAxis={[{ 
                  scaleType: 'point', 
                  dataKey: 'week',
                  label: 'Timeline (Last 12 Periods)' 
              }]}
              yAxis={[{ 
                  min: 1, 
                  max: 5,
                  label: 'Moving Average Rating'
              }]}
              series={[
                {
                  dataKey: 'app1Score',
                  label: app1Data?.appName || 'App 1',
                  color: '#2196F3', // Blue
                  curve: 'catmullRom',
                  showMark: true,
                },
                {
                  dataKey: 'app2Score',
                  label: app2Data?.appName || 'App 2',
                  color: '#10b981', // Green
                  curve: 'catmullRom',
                  showMark: true,
                },
              ]}
              slotProps={{
                  legend: {
                      direction: 'row',
                      position: { vertical: 'top', horizontal: 'middle' },
                      padding: 0,
                  },
              }}
              sx={{
                  '.MuiLineElement-root': { strokeWidth: 3 },
                  '.MuiMarkElement-root': { scale: '0.6' }
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SentimentComparison;