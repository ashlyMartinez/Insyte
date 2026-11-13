import React, { useState, useEffect } from 'react';
import { LineChart } from '@mui/x-charts/LineChart';
import Skeleton from '@mui/material/Skeleton';
import styles from './ComparePage.module.css';


// Make sure to pass app1Data and app2Data as props from your parent component!
const SentimentComparisonGraph = ({ app1Data, app2Data }) => {
  const [dataset, setDataset] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    const fetchComparisonData = async () => {
      // Ensure we have both IDs before attempting to fetch
      const id1 = app1Data?.trackId || app1Data?.appId;
      const id2 = app2Data?.trackId || app2Data?.appId;

      if (!id1 || !id2) {
        setLoading(false);
        setError(true);
        return;
      }
      setLoading(true);
      setError(false);

      try {
        // Fetch both analytics endpoints at the same time
        const [res1, res2] = await Promise.all([
          fetch(`http://localhost:8000/api/analytics/?trackId=${id1}`),
          fetch(`http://localhost:8000/api/analytics/?trackId=${id2}`)
        ]);

        if (!res1.ok || !res2.ok) {
          throw new Error("Network response was not ok");
        }

        const json1 = await res1.json();
        const json2 = await res2.json();

        const rawList1 = Array.isArray(json1) ? json1 : (json1?.data || json1?.results || []);
        const rawList2 = Array.isArray(json2) ? json2 : (json2?.data || json2?.results || []);

        // If either app returns your "No reviews found" error, trigger the fallback
        if (json1.error || json2.error || rawList1.length === 0 || rawList2.length === 0) {
          setError(true);
          setDataset([]);
          setLoading(false);
          return;
        }

        const maxLength = Math.max(rawList1.length, rawList2.length);
        const mergedData = [];

        for (let i = 0; i < maxLength; i++) {
          const item1 = rawList1[i] || {};
          const item2 = rawList2[i] || {};
          
          mergedData.push({
            period: item1.week || item1.date || item1.period || `Period ${i + 1}`,
            app1Score: item1.movingAvg ?? item1.score ?? item1.rating ?? null,
            app2Score: item2.movingAvg ?? item2.score ?? item2.rating ?? null,
          });
        }

        setDataset(mergedData);

      } catch (err) {
        console.error("Error fetching comparison analytics:", err);
        setError(true);
        setDataset([]);
      } finally {
        setLoading(false);
      }
    };
    fetchComparisonData();
  }, [app1Data, app2Data]);

  return (
    <div className={styles.graphBox}>
      <div className={styles.graphInformation}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h4 style={{ margin: 0 }}>THE QUALITY WAR: SENTIMENT OVER TIME</h4>
        </div>
       
        <div className={styles.graphImage} style={{ height: '400px', width: '100%' }}>
          {loading ? (
            <Skeleton 
              variant="rectangular" 
              width="100%" 
              height="100%" 
              animation="wave" 
              sx={{ borderRadius: '10px' }} 
            />
          ) : error || dataset.length === 0 ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#6c757d' }}>Not enough review data available to map comparison.</p>
            </div>
          ) : (
            <LineChart
              dataset={dataset}
              xAxis={[{ 
                  scaleType: 'point', 
                  dataKey: 'period',
                  label: 'Timeline' 
              }]}
              yAxis={[{ 
                  min: 1, 
                  max: 5,
                  label: 'Average Rating'
              }]}
              series={[
                {
                  dataKey: 'app1Score',
                  label: app1Data?.appName || 'App 1',
                  color: '#2196F3',
                  curve: 'catmullRom',
                  showMark: true,
                  valueFormatter: (value) => value == null ? 'N/A' : `${Number(value).toFixed(2)} ★`,
                },
                {
                  dataKey: 'app2Score',
                  label: app2Data?.appName || 'App 2',
                  color: '#10b981',
                  curve: 'catmullRom',
                  showMark: true,
                  valueFormatter: (value) => value == null ? 'N/A' : `${Number(value).toFixed(2)} ★`,
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

export default SentimentComparisonGraph;