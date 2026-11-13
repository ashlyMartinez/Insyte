import React from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import styles from './AppAnalytics.module.css';



export default function DummyMetricsSummaryRow({appMetrics}){
    return (
        <Row className="g-3 mb-4">
            {/* Metric 1: Monthly Installs */}
            <Col md={4}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Est. Monthly Installs</span>
                    <h2 className={styles.statValue}>{appMetrics.installs.value}</h2>
                    <p className={styles.statSubtext}>{appMetrics.installs.text}</p>
                </div>
            </Col>

            {/* Metric 2: Update Velocity */}
            <Col md={4}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>Last Updated</span>
                    <h2 className={styles.statValue}>{appMetrics.updatePill.value}</h2>
                    <p className={styles.statSubtext}>{appMetrics.updatePill.text}</p>
                </div>
            </Col>

            {/* Metric 3: Quality Gap */}
            <Col md={4}>
                <div className={styles.statCard}>
                    <span className={styles.statLabel}>All-Time vs Current</span>
                    <h2 className={styles.statValue}>{appMetrics.ratingRatio.value}</h2>
                    <p className={styles.statSubtext}>{appMetrics.ratingRatio.text}</p>
                </div>
            </Col>
        </Row>
    );
};