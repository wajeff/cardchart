import styles from './Home.module.css'
import { Link } from 'react-router-dom'


const Home = () => {
  
  return (
    <div>
      <ul className={styles.linkContainer}>
        <Link to='/amex_cobalt'> Amex Cobalt</Link>
        <Link to='/amex_platinum'> Amex Platinum</Link>
      </ul>
      

    </div>
  )
}

export default Home