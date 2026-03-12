import styles from "./Home.module.css";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div>
      <div className={styles.hero}>
        <h1 className={styles.title}>Card Chart</h1>
        <input id="searchBar" className={styles.search}></input>

        <section className={styles.cardsContainer}>
          <ul className={styles.linkContainer}>
            <Link to="/amex_cobalt" aria-label="Amex Cobalt" className={styles.cardLink}>
              <img
                src="/explorer_2019_ca_di_dod_480x304.avif"
                alt="Amex Cobalt"
                className={styles.card}
              />
            </Link>

            <Link to="/amex_platinum" className={styles.cardLink}>
              <img
                src="/explorer_2019_ca_di_dod_480x304.avif"
                alt="Amex Cobalt"
                className={styles.card}
              />
            </Link>

            <Link to="/amex_gold"> Amex Gold</Link>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default Home;
