import styles from "./TopBar.module.css";
import { useNavigate } from "react-router-dom";
import { FaUserCircle, FaBookmark } from "react-icons/fa";
import { MdQueryStats, MdKeyboardArrowDown } from "react-icons/md";

export default function TopBar() {
  const navigate = useNavigate();

  return (
    <header className={styles.topBar}>
      <div className={styles.navContainer}>
        {/* Logo + Site Name */}
        <button className={styles.brandButton} onClick={() => navigate("/")}>
          <div className={styles.logoBadge}>
            <MdQueryStats className={styles.logoIcon} />
          </div>
          <span className={styles.siteName}>Insyte</span>
        </button>

        {/* Right-Side Navigation */}
        <nav className={styles.navigation}>
          {/* Saved Apps */}
          <button
            className={styles.savedButton}
            onClick={() => navigate("/list")}
            title="Saved Apps"
          >
            <FaBookmark className={styles.bookmarkIcon} />
            <span className={styles.navLabel}>Saved</span>
          </button>

          <div className={styles.divider} />

          {/* User Profile */}
          <button className={styles.userButton}>
            <FaUserCircle className={styles.userIcon} />
            <span className={styles.username}>Username</span>
            <MdKeyboardArrowDown className={styles.arrow} />
          </button>
        </nav>
      </div>
    </header>
  );
}