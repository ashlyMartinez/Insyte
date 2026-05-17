const baseURL = 'http://localhost:8000';
async function fetchAnalyticsData(trackId, endpoint = '/api/analytics/') {
      // Don't fetch if there's no ID
      if (!trackId) return; 

      
      try {
        // Call your new Django endpoint
        const response = await fetch(`${baseURL}${endpoint}?trackId=${trackId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics data');
        }

        const json = await response.json();
        
        // Feed the Django data directly into the chart's state
        return json.data;
        
      } catch (err) {
        console.error("Error fetching analytics:", err);
        
      }

}

export { fetchAnalyticsData };