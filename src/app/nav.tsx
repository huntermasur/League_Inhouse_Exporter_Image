import { Link, useLocation } from 'react-router-dom';
import styles from './nav.module.css';

const links = [
  { to: '/', label: 'Upload' },
  { to: '/games', label: 'Games' },
  { to: '/stats', label: 'Stats' },
];

export function Nav() {
  const { pathname } = useLocation();

  return (
    <nav className={styles.nav} aria-label="Main navigation">
      <span className={styles.brand}>Inhouse Stats</span>
      <ul className={styles.links}>
        {links.map(({ to, label }) => (
          <li key={to}>
            <Link
              to={to}
              className={pathname === to ? styles.active : undefined}
              aria-current={pathname === to ? 'page' : undefined}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
