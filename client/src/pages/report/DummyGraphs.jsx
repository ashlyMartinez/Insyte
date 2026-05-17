import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { BarChart, LineChart } from '@mui/x-charts';
import styles from './Graphs.module.css';

// added below imports for analytics data fetching
import { useState, useEffect } from 'react';
import {fetchAnalyticsData} from '../../api/reviewAnalystics.js';
import { CircularProgress, Alert } from '@mui/material';
import { data } from 'react-router-dom';

function DummyGraphs({trackId}){
  
  const [dataset, setDataset] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // 2. The Async Fetch Function inside useEffect
  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true); // Start loading spinner
      setError(null); // Clear previous errors
      try {
        const data = await fetchAnalyticsData(trackId); // Call the function that fetches data from Django
        setDataset(data); // Update state with the fetched data
      } catch (err) {
        console.error("Error loading analytics:", err);
        setError("Failed to load analytics data.");
      } finally {
        setIsLoading(false); // Stop loading spinner
      }
    };

    loadAnalytics(); 

  }, [trackId]); 

  if (isLoading) {
    return (
      <div className={styles.graphBox} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '350px' }}>
        <CircularProgress /> {/* Professional loading spinner */}
      </div>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  console.log("Dataset for Graphs:", typeof dataset[0].threshold === 'number', dataset);

  return (
    <Container className={styles.graphsContainer}>
      <Row className="g-4">
        
        {/* --- DOWNLOADS / VELOCITY GRAPH --- */}
        <Col lg={12}>
          
          <div className={styles.graphBox}>
            <div className={styles.graphInformation}>
              <h4>{dataset[0]?.isDaily ? "DAILY MOMENTUM" : "BREAKOUT VELOCITY (WEEKLY)"}</h4>
              <div className={styles.graphImage}>
                <BarChart
                  dataset={dataset}
                  xAxis={[{ scaleType: 'band', dataKey: 'week' }]}
                  series={[
                    { dataKey: 'reviews', label: 'New Reviews', color: '#2196F3' },
                    { 
                      type: 'line', 
                      dataKey: 'threshold', 
                      connectNulls: true,
                      label: 'Viral Threshold', 
                      color: '#ef4444', 
                      yAxisId: 'reviewAxis',
                      showMark: true, 
                      highlightScope: { faded: 'global', highlighted: 'item' },
                    valueFormatter: (value) => `${value} reviews`,
                      // Add this to make bars semi-transparent
                      
                    }
                    
                  ]}
                  height={350}
                  sx={{
                    '& .MuiLineElement-root': { strokeDasharray: '5 5', strokeWidth: 2, opacity: 0.8 }
                  }}
                />
              </div>
            </div>
          </div>

        </Col>

        {/* --- RATINGS GRAPH --- */}
        <Col lg={12}>
          <div className={styles.graphBox}>
            <div className={styles.graphInformation}>
              <h4>SENTIMENT PULSE (RATINGS)</h4>
              <div className={styles.graphImage}>
                <LineChart
                  dataset={dataset}
                  xAxis={[{ scaleType: 'point', dataKey: 'week' }]}
                  yAxis={[{ min: 1, max: 5 }]}
                  series={[
                    { dataKey: 'movingAvg', label: 'Weekly Moving Avg', color: '#10b981', curve: 'catmullRom' },
                    { dataKey: 'overallAvg', label: 'All-Time Average', color: '#9ca3af', showMark: false }
                  ]}
                  height={350}
                  sx={{
                    '& .MuiLineElement-series-overallAvg': { strokeDasharray: '4 4' }
                  }}
                />
              </div>
            </div>
          </div>
        </Col>

        {/* --- OTHER METRICS --- */}
        <Col lg={12}>
            <div className={styles.graphBox}>
                <div className={styles.graphInformation}>
                    <h4>OTHER METRICS</h4>
                    <div className={styles.graphImage}>
                        <div className={styles.emptyGraphPlaceholder}>
                            Awaiting Market Data...
                        </div>
                    </div>
                </div>
            </div>
        </Col>
      </Row>
    </Container>
  );
};

export default DummyGraphs;