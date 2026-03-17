import { Link } from 'react-router-dom'
import styles from './Navbar.module.css'

const Navbar = () => {
  return (
    <nav>
      <ul className={styles.navList}>
        <li className={styles.navItem}>
          <Link to ='/'> Home </Link>
        </li>
         <li className={styles.navItem}>
          <Link to ='/Points'> Points </Link>
        </li>
        <img className={styles.searchIcon} src='/search-solid.svg'/>
      </ul>
    </nav>
  )
}

export default Navbar
