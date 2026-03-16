import styles from "./Home.module.css";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div>
      <div className={styles.hero}>
        <div className={styles.headingBlock}>
          <h1 className={styles.title}>Card Chart</h1>
          <h2 className={styles.subTitle}>
            Without fluff. Solely card data. 
          </h2>
        </div>
        
        <section className={styles.cardsOrbitSystem}>
          <div className={`${styles.orbit} ${styles.orbitOne}`}>
            <Link to="/amex_cobalt" aria-label="Amex Cobalt" className={styles.orbitCard}>
              <img
                src="/explorer_2019_ca_di_dod_480x304.avif"
                alt="Amex Cobalt"
                className={styles.cardImage}
              />
            </Link>
          </div>

          <div className={`${styles.orbit} ${styles.orbitTwo}`}>
            <Link to="/amex_platinum" aria-label="Amex Platinum" className={styles.orbitCard}>
              <img
                src="/platinum.avif"
                alt="Amex Platinum"
                className={styles.cardImage}
              />
            </Link>
          </div>

          <div className={`${styles.orbit} ${styles.orbitThree}`}>
            <Link to="/amex_gold" aria-label="Amex Gold" className={styles.orbitCard}>
              <img
                src="/gold-card.avif"
                alt="Amex Gold"
                className={styles.cardImage}
              />
            </Link>
          </div>

          <div className={`${styles.orbit} ${styles.orbitFour}`}>
            <Link to="/td_first_class" aria-label="TD First Class" className={styles.orbitCard}>
              <img
                src="/td_first_class.png"
                alt="TD First Class"
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
