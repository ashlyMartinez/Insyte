import styles from './ComparePage.module.css';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SentimentComparisonGraph from './SentimentComparisonGraph.jsx'


const ComparePage = () => {
    
    const location = useLocation();
    const navigate = useNavigate();

    // 1. Destructure the data from location.state
    // We use optional chaining and a fallback to handle direct URL entries

    const [app1Data] = useState(location.state?.app1Data || null);
    const [app2Data] = useState(location.state?.app2Data || null);
   
    

    
    const lastUpdatedDate = (date)=>{
        if (date) {
           
            const lastUpdatedDate = new Date(date);
            const today = new Date();
            
            const diffTime = Math.abs(today - lastUpdatedDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            return `${diffDays} days ago`
             
        }

    }
    
    const formatNum = (n) => {
        // Formatting numbers into K/M 
        if (n === undefined || n === null || isNaN(n)) return ''; 
    
        if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
        if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
        return n.toString(); 
    };

    const handleReturn = ()=>{
        if (app1Data) {
            navigate(`/report/${app1Data.appId}/${app1Data.appName}`, { state: { appData: app1Data } });
        } else {
            navigate(-1);
        }
    }
    
    
    
    return (
        <div className={styles.reportPage}>
            <div className={styles.reportWrapper}>
                {/* Back Button */}
                    <button className={styles.backLink} onClick={handleReturn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" />
                    </svg>
                    Back to Report
                    </button>
                
                <header className={styles.stickyHeader}>
                    <div className={styles.appIdentity} style={{ justifyContent: 'flex-end' }}>
                        <span style={{ fontWeight: 700 }}>{app1Data.appName}</span>
                        <img src={app1Data.iconUrl} alt={app1Data?.appName} className={styles.appIcon} />
                    </div>

                    <div className={styles.vsCircle}>VS</div>

                    <div className={styles.appIdentity}>
                        <img src={app2Data.iconUrl} alt={app2Data.appName} className={styles.appIcon} />
                        <span style={{ fontWeight: 700 }}>{app2Data?.appName}</span>
                    </div>
                </header>

                <main className={styles.contentArea}>
                    {/* Market Moat */}
                    <div className={styles.metricRow}>
                        <div className={`${styles.metricValue} ${styles.winner}`} style={{ textAlign: 'right' }}>
                            {formatNum(app1Data?.ratingCount)}
                        </div>
                        <div className={styles.metricLabel}>Review Count</div>
                        <div className={styles.metricValue} style={{ textAlign: 'left' }}>
                            {formatNum(app2Data?.ratingCount)}
                        </div>
                    </div>

                    {/* Update Frequency */}
                    <div className={styles.metricRow}>
                        <div className={styles.metricValue} style={{ textAlign: 'right' }}>
                            {lastUpdatedDate(app1Data?.currentVersionReleaseDate)} <br/>
                        </div>

                        <div className={styles.metricLabel}>Ship Frequency</div>

                        <div className={styles.metricValue} style={{ textAlign: 'left' }}>
                            {lastUpdatedDate(app2Data?.currentVersionReleaseDate)} <br/>
                        </div>
                    </div>

                    {/* Version Churn Risk */}
                    <div className={styles.metricRow}>
                        <div className={styles.metricValue} style={{ textAlign: 'right' }}>
                            All-Time: {app1Data?.averageRating?.toFixed(2)}★ <br/>
                            Current: {app1Data?.currentVersionRating?.toFixed(2)}★
                        </div>
                        <div className={styles.metricLabel}>Quality War</div>
                        <div className={styles.metricValue} style={{ textAlign: 'left' }}>
                            All-Time: {app2Data?.averageRating?.toFixed(2)}★ <br/>
                            <span className={styles.warning}>Current: {app2Data?.currentVersionRating?.toFixed(2)}★</span>
                        </div>
                    </div>

                
                    <SentimentComparisonGraph app1Data={app1Data} app2Data={app2Data} />

                </main>
            </div>
        </div>
    );
};

export default ComparePage;