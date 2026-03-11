import styles from './Home.module.css'
import { Link } from 'react-router-dom'


const Home = () => {
  
  return (
    <div>
      <h1 className={styles.title}>Card Chart</h1>
      <ul className={styles.linkContainer}>
        <Link to='/amex_cobalt'> Amex Cobalt</Link>
        <Link to='/amex_platinum'> Amex Platinum</Link>
        <Link to='/amex_gold'> Amex Gold</Link>
      </ul>
      

    </div>
  )
}

export default Home
