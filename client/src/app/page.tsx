import Link from "next/link";
import styles from "./page.module.css";
import cardAssets from "@/cardAssets";

const Home = () => {
  return (
    <div className={styles.hero}>
      <div className={styles.headingBlock}>
        <h1 className={styles.title}>Card Chart</h1>
        <h2 className={styles.subTitle}>
          Without fluff. Solely card data. 
        </h2>
      </div>
      
      <section className={styles.cardsOrbitSystem}>
        <div className={`${styles.orbit} ${styles.orbitOne}`}>
          <Link href="/amex_cobalt" aria-label="Amex Cobalt" className={styles.orbitCard}>
            <span className={styles.cardFrame}>
              <img
                src={cardAssets['amex_cobalt']?.src}
                alt="Amex Cobalt"
                className={styles.cardImage}
              />
            </span>
          </Link>
        </div>

        <div className={`${styles.orbit} ${styles.orbitTwo}`}>
          <Link href="/amex_platinum" aria-label="Amex Platinum" className={styles.orbitCard}>
            <span className={styles.cardFrame}>
              <img
                src={cardAssets['amex_platinum']?.src}
                alt="Amex Platinum"
                className={styles.cardImage}
              />
            </span>
          </Link>
        </div>

        <div className={`${styles.orbit} ${styles.orbitThree}`}>
          <Link href="/amex_gold" aria-label="Amex Gold" className={styles.orbitCard}>
            <span className={styles.cardFrame}>
              <img
                src={cardAssets['amex_gold']?.src}
                alt="Amex Gold"
                className={styles.cardImage}
              />
            </span>
          </Link>
        </div>

        <div className={`${styles.orbit} ${styles.orbitFour}`}>
          <Link href="/td_first_class" aria-label="TD First Class" className={styles.orbitCard}>
            <span className={styles.cardFrame}>
              <img
                src={cardAssets['td_first_class']?.src}
                alt="TD First Class"
                className={styles.cardImage}
              />
            </span>
          </Link>
        </div>
        <div className={`${styles.orbit} ${styles.orbitFive}`}>
          <Link href="/scotia_visa_infinite_privilege" aria-label="Scotiabank Visa Infinite" className={styles.orbitCard}>
            <span className={styles.cardFrame}>
              <img
                src={cardAssets['scotia_visa_infinite_privilege']?.src}
                alt="Scotiabank Visa Infinite"
                className={styles.cardImage}
              />
            </span>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;
