import { useState, useMemo } from "react";
import styles from "./AppReviews.module.css";

export default function AppReviews({ appReviews }) {
  const rawReviews = appReviews?.reviews || [];
  const [displayLimit, setDisplayLimit] = useState(4); // Start by showing 4 cards
 
  const processedReviews = useMemo(() => {
    if (!rawReviews || rawReviews.length === 0) return [];

    const MIN_WORD_COUNT = 8;
    const EXCELLENT_WORD_COUNT = 35;

    return rawReviews
      .filter((review) => {
        const text = review.content || "";
        const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
        return wordCount >= MIN_WORD_COUNT;
      })
      .map((review) => {
        const title = review.title || "";
        const text = review.content || "";
        const rating = parseInt(review.rating, 10) || 3;
        const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
        
        let score = wordCount;
        if (wordCount >= EXCELLENT_WORD_COUNT) score += 25;
        if (title.trim().length > 15) score += 10;
        if (rating === 1 || rating === 5) score += 15;

        return {
          ...review,
          calculatedWordCount: wordCount,
          helpfulnessScore: score,
        };
      })
      .sort((a, b) => b.helpfulnessScore - a.helpfulnessScore)
      .slice(20, 40); // Keep top 20 total for the feed
  }, [rawReviews]);

  
  const handleLoadMore = () => {
    setDisplayLimit((prev) => prev + 4); // Load 4 more at a time
  };

  const visibleReviews = processedReviews.slice(0, displayLimit);
  const hasMore = displayLimit < processedReviews.length;

  if (!appReviews || processedReviews.length === 0) {
    return (
      <div className={styles.appReviewSection}>
        <div className={styles.sectionHeader}>
          <h1>Reviews</h1>
          <p>Filtered for substantive feedback.</p>
        </div>
        <div className={styles.emptyState}>
          <p>No substantive reviews available for analysis.</p>
        </div>
      </div>
    );
  }


  return (
    <div className={styles.appReviewSection}>
      
      {/* HEADING TITLE */}
      <div className={styles.sectionHeader}>
        <h1>Reviews</h1>
        <p>Filtered by degree of helpfulness and detail.</p>
      </div>

      {/* 2-COLUMN GRID INSTEAD OF CAROUSEL */}
      <div className={styles.reviewGrid}>
        {visibleReviews.map((r) => {
          const filledStars = Number(r.rating) || 0;

          return (
            <div key={r.id} className={styles.reviewCard}>
              
              <div className={styles.cardHeader}>
                <span className={styles.reviewerName}>{r.author}</span>
                {r.calculatedWordCount >= 35 && (
                  <span className={styles.priorityBadge}>
                    Detailed ({r.calculatedWordCount} words)
                  </span>
                )}
              </div>

              <h4>{r.title}</h4>

              <div className={styles.starRating}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={i < filledStars ? styles.starFilled : styles.starEmpty}
                  >
                    ★
                  </span>
                ))}
              </div>

              <p className={styles.reviewText}>{r.content}</p>
            </div>
          );
        })}
      </div>

      
      {hasMore && (
        <div className={styles.loadMoreContainer}>
          <button className={styles.loadMoreBtn} onClick={handleLoadMore}>
            Load More Signals
          </button>
        </div>
      )}

    </div>
  );
}