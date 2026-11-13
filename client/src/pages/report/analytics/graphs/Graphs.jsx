import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { LineChart } from '@mui/x-charts';
import styles from './Graphs.module.css';

// added below imports for analytics data fetching
import { useState, useEffect } from 'react';
import {fetchAnalyticsData} from '../../../../api/reviewAnalystics.js';
import { CircularProgress, Alert } from '@mui/material';



function Graphs({trackId}){
  
  const [dataset, setDataset] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  
  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true); 
      setError(null); 
      try {
        const data = await fetchAnalyticsData(trackId); 
        setDataset(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Error loading analytics:", err);
        setError("Failed to load analytics data from server.");
        setDataset([]);
      
      } finally {
        setIsLoading(false); 
      }
    };

    if (trackId) {
      loadAnalytics(); 
    } else {
      setIsLoading(false);
      setDataset([]);
    }

  }, [trackId]); 
  console.log("Dataset in DummyGraphs:", dataset);

  if (isLoading) {
    return (
      <div className={styles.graphBox} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '350px' }}>
        <CircularProgress /> 
      </div>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }
  


  return (
    <Container className={styles.graphsContainer}>
      <Row className="g-4">
        
        {/* --- DOWNLOADS / VELOCITY GRAPH --- */}
        <Col lg={12}>
          <div className={styles.graphBox}>
            <div className={styles.graphInformation}>
              
              <h4>{dataset?.[0]?.isDaily ? "RATING COUNT (DAILY)" : "RATING COUNT (WEEKLY)"}</h4>
              
              <div className={styles.graphImage}>
                {!dataset || dataset.length === 0 ? (
                  <div style={{ 
                    height: '350px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#6c757d',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    <p>Not enough historical data to chart breakout velocity.</p>
                  </div>
                ) : (
                  <LineChart
                    dataset={dataset}
                    xAxis={[{ scaleType: 'point', dataKey: 'week' }]}
                    margin={{ top: 40, right: 30, bottom: 40, left: 60 }}
                    series={[
                      { dataKey: 'reviews', label: 'New Reviews', color: '#2196F3', curve: 'catmullRom', showMark: true },
                      { 
                        dataKey: 'threshold', 
                        id: 'thresholdSeries', 
                        connectNulls: true,
                        label: 'Viral Threshold', 
                        color: '#ef4444', 
                        showMark: false, 
                        valueFormatter: (value) => value ? `${value} reviews` : 'N/A',
                      }
                    ]}
                    height={350}
                    sx={{
                      '& .MuiLineElement-series-thresholdSeries': { strokeDasharray: '5 5', strokeWidth: 2, opacity: 0.8 }
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </Col>
       

        {/* --- RATINGS GRAPH --- */}
        <Col lg={12}>
          <div className={styles.graphBox}>
            <div className={styles.graphInformation}>
              <h4>{dataset?.[0]?.isDaily ? "RATING TREND (DAILY)" : "RATING TREND (WEEKLY)"}</h4>
              <div className={styles.graphImage}>
                {!dataset || dataset.length === 0 ? (
                  <div style={{ 
                    height: '350px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    color: '#6c757d',
                    fontFamily: "'Inter', sans-serif",
                    
                    borderRadius: '12px'
                  }}>
                    <p>Not enough historical data to chart sentiment pulse.</p>
                  </div>
                ) : (
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
                />)}
              </div>
            </div>
          </div>
        </Col>

        
      </Row>
    </Container>
  );
};

export default Graphs;