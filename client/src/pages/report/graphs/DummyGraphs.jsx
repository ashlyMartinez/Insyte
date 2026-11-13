import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { BarChart, LineChart } from '@mui/x-charts';
import styles from './Graphs.module.css';

// added below imports for analytics data fetching
import { useState, useEffect } from 'react';
import {fetchAnalyticsData} from '../../../api/reviewAnalystics.js';
import { CircularProgress, Alert } from '@mui/material';
import { data } from 'react-router-dom';

const dummySingleData = [
  { week: "Wk 1", reviews: 20, threshold: 26.2, movingAvg: 3.25, overallAvg: 3.07, versionFragility: false, isDaily: false },
  { week: "Wk 2", reviews: 27, threshold: 26.2, movingAvg: 3.04, overallAvg: 3.07, versionFragility: false, isDaily: false },
  { week: "Wk 3", reviews: 16, threshold: 26.2, movingAvg: 2.44, overallAvg: 3.07, versionFragility: false, isDaily: false },
  { week: "Wk 4", reviews: 17, threshold: 26.2, movingAvg: 2.71, overallAvg: 3.07, versionFragility: false, isDaily: false },
  { week: "Wk 5", reviews: 19, threshold: 26.2, movingAvg: 3.00, overallAvg: 3.07, versionFragility: false, isDaily: false },
  { week: "Wk 6", reviews: 12, threshold: 26.2, movingAvg: 3.42, overallAvg: 3.07, versionFragility: false, isDaily: false },
  { week: "Wk 7", reviews: 15, threshold: 26.2, movingAvg: 2.60, overallAvg: 3.07, versionFragility: false, isDaily: false },
  { week: "Wk 8", reviews: 12, threshold: 26.2, movingAvg: 3.50, overallAvg: 3.07, versionFragility: false, isDaily: false },
  { week: "Wk 9", reviews: 20, threshold: 26.2, movingAvg: 2.80, overallAvg: 3.07, versionFragility: false, isDaily: false },
  { week: "Wk 10", reviews: 13, threshold: 26.2, movingAvg: 3.38, overallAvg: 3.07, versionFragility: false, isDaily: false },
  { week: "Wk 11", reviews: 18, threshold: 26.2, movingAvg: 3.11, overallAvg: 3.07, versionFragility: false, isDaily: false },
  { week: "Wk 12", reviews: 21, threshold: 26.2, movingAvg: 3.19, overallAvg: 3.07, versionFragility: false, isDaily: false }
];

function DummyGraphs({trackId}){
  
  const [dataset, setDataset] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  
  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true); 
      setError(null); 
      try {
        const data = await fetchAnalyticsData(trackId); 
        setDataset(data);
      } catch (err) {
        console.error("Error loading analytics:", err);
        setDataset(dummySingleData);
        setIsDemoMode(true);

      } finally {
        setIsLoading(false); 
      }
    };

    loadAnalytics(); 

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
                    
                    borderRadius: '12px'
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

export default DummyGraphs;