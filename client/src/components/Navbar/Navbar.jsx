import { Link } from 'react-router-dom'
import styles from './Navbar.module.css'
const Navbar = () => {
  return (
    <nav>
      <ul className={styles.navList}>
        <li className={styles.navItem}>
          <Link to ='/'> Home </Link>
        </li>
      </ul>
    </nav>
  )
}

export default Navbar
