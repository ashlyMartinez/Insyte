import styles from "./AppDetailBasics.module.css";
import { useNavigate } from "react-router-dom";
import Accordion from 'react-bootstrap/Accordion';


export default function AppDetailBasics({ app, onCompareClick, onSave, isSaved, saving  }) {
  const navigate = useNavigate();
  const { 
        appName, developerName, iconUrl, genre, 
        averageRating, ratingCount, contentAdvisoryRating,
        version, currentVersionRating, currentVersionRatingCount, 
        initialReleaseDate, currentVersionReleaseDate, description
    } = app;



  const formatNum = (n) => {
    // Formatting numbers into K/M 
    if (n === undefined || n === null || isNaN(n)) return ''; 
  
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(0) + 'K';
    return n.toString(); 
  };
  
  const handleReturn = () =>{
    navigate(`/`)
  }

  return (
    <div className={styles.basicDetailsWrapper}>

      {/* Back Button (Top Left) */}
      <button className={styles.backLink} onClick={handleReturn}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        Back to Search
      </button>

      {/* App Infortmation Section */}
      <div className={styles.appDetails}>

        {/* Main Header - App logo and compare button */}
        <header className={styles.mainHeader}>
          <div className={styles.appIdentity}>
            <img src={iconUrl} alt={appName} className={styles.appIcon} />
            <div className={styles.appTitleGroup}>
              <h1>{appName}</h1>
              <span className={styles.developerSub}>{developerName}</span>
            </div>
          </div>

          {/* Button Group pushed cleanly to the right side via auto margin */}
          <div className={styles.buttonGroup}>
            <button
              className={`${styles.saveButton} ${isSaved ? styles.saveButtonActive : ''}`}
              onClick={onSave}
              disabled={saving || isSaved}
              >
              <svg width="14" height="14" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
              </svg>

              {saving ? 'Saving...' : isSaved ? 'Saved' : 'Save App'}
            </button> 
            
            <button className={styles.compareBtn} onClick={onCompareClick}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M4 4l5 5" />
              </svg>
              Compare
            </button>
          </div>

        </header>

        {/* Detailed App Information Section */}
        <div className={styles.infoBar}>

          {/* Rating */}
          <div className={styles.infoSection}>
            <span className={styles.infoLabel}>{formatNum(ratingCount)} RATINGS</span>
            <span className={styles.infoValue}>{averageRating.toFixed(1)} ★</span>
          </div>
              
          <div className={styles.divider}></div>

          {/* Content Adivsory Rating */}
          <div className={styles.infoSection}>
            <span className={styles.infoLabel}>AGE</span>
            <span className={styles.infoValue}>{contentAdvisoryRating}</span>
            
          </div>

          <div className={styles.divider}></div>

          {/* Genre */}
          <div className={styles.infoSection}>
            <span className={styles.infoLabel}>GENRE</span>
            <div className={styles.iconValue}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M2 12h20" /></svg>
              <span className={styles.infoValue}>{genre}</span>
            </div>
          </div>

          <div className={styles.divider}></div>

          {/* Developer */}
          <div className={styles.infoSection}>
            <span className={styles.infoLabel}>DEVELOPER</span>
            <div className={styles.iconValue}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
              <span className={styles.infoValue}>{developerName}</span>
            </div>
          </div>

          <div className={styles.divider}></div>
          
          {/* Version */}
          <div className={styles.infoSection}>
            <span className={styles.infoLabel}>VERSION</span>
            <span className={styles.infoValue}>{version}</span>
          </div>

        </div>

      </div>

    </div>
  );
}
