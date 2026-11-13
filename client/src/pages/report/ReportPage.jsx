import styles from './ReportPage.module.css'

import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { getAppDetails, getApps, saveApp, getTrackedApps } from '../../api/searchApps.js';


import CompareModal from '../compare/CompareModal.jsx';

import AppDetailBasics from "./AppDetailBasics.jsx";
import AppAnalytics from "./analytics/overview/AppAnalytics.jsx";


import AppReviews from "./analytics/reviews/AppReviews.jsx";

import Graphs from './analytics/graphs/Graphs.jsx';    

import ReportSkeleton from '../../components/skeleton/ReportSkeleton.jsx';


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
    const [savedApps, setSavedApps] = useState(location.state?.savedApps || []);


    useEffect(() => {
        const fetchReport = async () => {
            try {
                let currentApp = appData;

                // 1. If the appData obj is Null -> State has been lost
                if (!currentApp && name ) {
                    console.log("State lost, recovering app details via name")
                    const apps = await getApps(name);
                    currentApp = apps.find(app => String(app.trackId) === String(appId));
                    setAppData(currentApp);
                }
                
                const fetchedReviews = await getAppDetails(appId);
                setReviews(fetchedReviews);

                const trackedApps = await getTrackedApps();
                const currentApps = trackedApps.filter(app => String(app.trackId) !== String(appId));
                setSavedApps(currentApps);

                const checkIfSaved = trackedApps.some(savedApp => String(savedApp.trackId) === String(appId));
                setIsSaved(checkIfSaved);

            } catch (error) {
                console.error("Error fetching report data:", error);
            } finally {
                setLoading(false);
            }
        };

        if (appId) {
            fetchReport();
        }

    }, [appId, name]);

    if (loading) return <ReportSkeleton />;

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

            <div className={styles.reportWrapper}>

                {/* App Header - Displays app info and compare button */}
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
                        Overview
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

                    {activeTab === 'analytics' && <Graphs trackId={appData.trackId}/>}

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


