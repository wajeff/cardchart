import styles from "./Home.module.css";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div>
      <div className={styles.hero}>
        <h1 className={styles.title}>Card Chart</h1>
        <input id="searchBar" className={styles.search}></input>

        <section className={styles.cardsContainer}>
          <div className={styles.card}>
            <Link to="/amex_cobalt" aria-label="Amex Cobalt">
              <img
                src="/explorer_2019_ca_di_dod_480x304.avif"
                alt="Amex Cobalt"
                className={styles.cardImage}
              />
            </Link>
          </div>

          <div className={styles.card}>
            <Link to="/amex_platinum">
              <img
                src="/platinum.avif"
                alt="Amex Cobalt"
                className={styles.cardImage}
              />
            </Link>
          </div>

          <div className={styles.card}>
            <Link to="/amex_gold">
              <img
                src="/gold-card.avif"
                alt="Amex Cobalt"
                className={styles.cardImage}
              />
            </Link>
          </div>
          <div className={styles.card}>
            <Link to="/amex_gold">
              <img
                src="/td_first_class.png"
                alt="Amex Cobalt"
                className={styles.cardImage}
              />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
