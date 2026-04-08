import Link from "next/link";
import styles from './Navbar.module.css'

const Navbar = () => {
  return (
    <nav>
      <ul className={styles.navList}>
        <li className={styles.navItem}>
          <Link href="/"> Home </Link>
        </li>
         <li className={styles.navItem}>
          <Link href="/points"> Points </Link>
        </li>
        <img className={styles.searchIcon} src='/search-solid.svg'/>
      </ul>
    </nav>
  )
}

export default Navbar
