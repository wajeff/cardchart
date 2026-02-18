import { Link } from 'react-router-dom'
import styles from './Navbar.module.css'
const Navbar = () => {
  return (
    <nav>
      <ul>
        <li>
          <Link to ='/'> Home </Link>
        </li>
      </ul>
    </nav>
  )
}

export default Navbar