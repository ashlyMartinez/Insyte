export const transformAppMetrics = (rawAppData) => {
  // Safe Fallback 
  if (!rawAppData) {
    return { installs: { value: "N/A", text: "" },
      updatePill: { value: "N/A", text: "" },
      ratingRatio: { value: "N/A", text: "" }};
  }

  
  const ratingCount = rawAppData.ratingCount ?? 0;
  const initialDateStr = rawAppData.initialReleaseDate ?? "";
  const currentVersionReleaseDateStr = rawAppData.currentVersionReleaseDate ?? "";
  const allTimeRating = rawAppData.averageRating ?? 0;
  const currentVersionRating = rawAppData.currentVersionRating ?? 0;


  let installsObj = { value: "0", text: "No downloads detected" };
  
  if (ratingCount > 0) {
    const estimatedInstalls = ratingCount * 4; // Review proxy calculation
    let formattedInstalls = "";
    let volumeTier = "Low Volume";

    // Format the number tightly
    if (estimatedInstalls >= 1000000) {
      formattedInstalls = (estimatedInstalls / 1000000).toFixed(1) + "M+";
      volumeTier = "Enterprise Moat";
    } else if (estimatedInstalls >= 1000) {
      formattedInstalls = (estimatedInstalls / 1000).toFixed(0) + "K+";
      volumeTier = "Mid-Market Scale";
    } else {
      formattedInstalls = estimatedInstalls.toString();
      volumeTier = "Early Traction";
    }

    installsObj = {
      value: formattedInstalls,
      text: volumeTier
    };
  }

  let updatePillObj = { value: "Unknown", text: "Unknown status" };
  if (currentVersionReleaseDateStr) {
    try {
      const lastUpdatedDate = new Date(currentVersionReleaseDateStr);
      const today = new Date();
    
      const diffTime = Math.abs(today - lastUpdatedDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 14) {
        updatePillObj = {text:"Signal: High Agility", value: `${diffDays} Days Ago`, signal: "positive"};
      } else if (diffDays <= 60) {
        updatePillObj = {text:"Signal: Moderate Agility", value: `${diffDays} Days Ago`, signal: "neutral"};
      } else {
        updatePillObj = {text:"Risk", value: `${Math.floor(diffDays / 30)} Months Ago`, signal: "negative"};
      }
    } catch (e) {
      updatePillObj = {value:"Unknown", text: "Unknown status"};
    }
  }


  let ratingRatioObj = { value: "N/A", text: "Unknown status"  };
  if (allTimeRating > 0 && currentVersionRating > 0) {
    const delta = allTimeRating - currentVersionRating;
    
    // Build human-readable comparative logic for a VC evaluating product stability trends
    if (delta > 1.0) {
      ratingRatioObj = { signal: "negative", value: `${allTimeRating.toFixed(1)} v.s. ${currentVersionRating.toFixed(1)}`, text: `Droppd ${delta.toFixed(1)} stars` };
    } else if (delta < -0.2) {
      ratingRatioObj = { signal: "positive", value: `${allTimeRating.toFixed(1)} v.s. ${currentVersionRating.toFixed(1)}`, text: `Increased ${Math.abs(delta).toFixed(1)} stars` };
    } else {
      ratingRatioObj = { signal: "neutral", value: `${allTimeRating.toFixed(1)}`, text: `Current rating matches all-time rating` };
    }
  }


  return {
    installs: { value: String(installsObj.value ?? ""), text: String(installsObj.text ?? "") },
    updatePill: { value: String(updatePillObj.value ?? ""), text: String(updatePillObj.text ?? "") },
    ratingRatio: { value: String(ratingRatioObj.value ?? ""), text: String(ratingRatioObj.text ?? "") }
  };
};


