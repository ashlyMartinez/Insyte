import styles from "./AppAnalytics.module.css";
import { Container, Row, Col } from 'react-bootstrap';
import MetricsSummaryRow from './MetricsSummaryRow.jsx';
import { transformAppMetrics } from './transformAppMetrics.js'
export const AppAnalytics = ({app}) => {
  
  const appMetrics = transformAppMetrics(app);
  
  return (

    <Container fluid className={styles.dashboardContainer}>
      
      {/* Header Row */}
      <Row className="g-5">

        {/* Overview Tab Title */}
        <Col lg={12}>
          <div className= {styles.sectionHeader}>
            <h1 className={styles.analyticsTitle}>Overview</h1>
            <p>Basic application statistics.</p>
          </div>
        </Col>

        {/* Application Statistics */}
        <MetricsSummaryRow appMetrics={appMetrics} />
      </Row>    
    </Container>
  );
};




export default AppAnalytics;