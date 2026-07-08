import { NavLink } from 'react-router-dom';
import styles from './Nav.module.css';

export default function Nav() {
  return (
    <header className={styles.nav}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.wordmark}>
          <span className={styles.dot} />
          STREAMSTACK
        </NavLink>
        <nav className={styles.links}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
          >
            Browse
          </NavLink>
          <NavLink
            to="/upload"
            className={({ isActive }) => (isActive ? styles.activeLink : styles.link)}
          >
            Upload
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
