import styles from './ReportPage.module.css'

// Not sure how important the dummy data will be 
import { appsList } from "./DummyData.js";
import {savedApps} from './DummyData.js';


import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { getAppDetails, getApps, saveApp } from '../../api/searchApps.js';


import Modal from 'react-bootstrap/Modal';
import CompareModal from './CompareModal.jsx';

import AppDetailBasics from "./AppDetailBasics.jsx";
import AppAnalytics from "./AppAnalytics";
import Graphs from "./Graphs.jsx"
import AppReviews from "./AppReviews";
import DummyGraphs from './DummyGraphs.jsx';    

export default function ReportPage() {
    // Get appId & name from URL params 
    let { appId, name } = useParams();

    // Allows you to pass data from one route to another
    const location = useLocation();

    // Initialize appData state with location.state OR null
    // Note: When the report page is refreshed, the appData will be lost.
    // Thats why we add logic in the useEffect to fetch the data from the backend if appData is null
    const [appData, setAppData] = useState(location.state?.appData || null);

    // State for the reviews
    const [reviews, setReviews] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // State to determine what report content to render
    const [activeTab, setActiveTab] = useState('overview');
    const [showCompareModal, setShowCompareModal] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [saving, setSaving] = useState(false);
    

    useEffect(() => {
        const fetchReport = async () => {
            try {

                let currentApp = appData;

                // If the appData obj is Null -> State has been lost
                if (!currentApp && name) {
                    console.log("State lost, recovering app details via name")

                    // Fetch apps again based on name 
                    const apps = await getApps(name);

                    // From app list, find the app with the correct trackId
                    currentApp = apps.find(app => String(app.trackId) === String(appId));

                    // Update the appData
                    setAppData(currentApp);
                }

                // Logic for fetching the reviews
                const fetchedReviews = await getAppDetails(appId);
                setReviews(fetchedReviews);

                // Don't automatically mark the app as saved unless the user chooses it.
                setIsSaved(false);

            } catch (error) {
                console.log(error);
            } finally {
                setLoading(false);
            }
        };
        if (appId) {
            fetchReport();
        }

    }, [appId, name]);

    if (loading) return <div>Loading...</div>;

    console.log("AppData in ReportPage:", appData);
    console.log(`Reviews in ReportPage:`, reviews);
    console.log("Rendering DummyGraphs with trackId:", appData?.trackId);

    const handleSaveApp = async () => {
        if (!appData || saving || isSaved) return;
        setSaving(true);
        const result = await saveApp(appData);
        setSaving(false);
        if (result) {
            setIsSaved(true);
        }
    };

    return (
        <div className={styles.reportPage}>

            {/* Global Naviation should be placed here */}

            <div className={styles.reportWrapper}>
                {/* App Header - Displays app info and compare button */}
                {/* ___________________UPDATE THIS COMPONENT TO INCLUDE SAVE FUNCTIONALITY _____-______________________*/}
                <AppDetailBasics 
                    app={appData} 
                    onCompareClick={() => setShowCompareModal(true)} 
                    onSave={handleSaveApp} 
                    isSaved={isSaved} 
                    saving={saving}
                />

                {/* Report Navigation */}
                <nav className={styles.tabNav}>
                    <button 
                        className={activeTab === 'overview' ? styles.activeTab : styles.tab} 
                        onClick={() => setActiveTab('overview')}
                    >
                        Overview & AI
                    </button>

                    <button 
                        className={activeTab === 'analytics' ? styles.activeTab : styles.tab} 
                        onClick={() => setActiveTab('analytics')}
                    >
                        Metrics
                    </button>

                    <button 
                        className={activeTab === 'reviews' ? styles.activeTab : styles.tab} 
                        onClick={() => setActiveTab('reviews')}
                    >
                        Community 
                    </button>
                </nav>

                {/* Dynamic Content Area */}
                <main className={styles.contentArea}>
                    {activeTab === 'overview' && <AppAnalytics app={appData} />}

                    {activeTab === 'analytics' && <DummyGraphs trackId={appData.trackId}/>}

                    {activeTab === 'reviews' && <AppReviews appReviews={reviews} />}
                </main>
                
                {/* Hidden Modal, ready to be triggered */}
                <CompareModal 
                    show={showCompareModal} 
                    onHide={() => setShowCompareModal(false)} 
                    currentApp={appData} 
                    savedApps={savedApps} 
                />
            </div> 

        </div>
    );
}


