"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./Navbar.module.css";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const closeMenu = () => setIsOpen(false);

  return (
    <nav className={styles.navbar}>
      <div className={styles.navShell}>
        <ul className={styles.navList}>
          <li className={styles.navItem}>
            <Link href="/">Home</Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/Points">Points</Link>
          </li>
          <li>
            <img
              className={styles.searchIcon}
              src="/search-solid.svg"
              alt="Search"
            />
          </li>
        </ul>

        <button
          type="button"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-controls="mobile-menu"
          aria-expanded={isOpen}
          className={`${styles.menuButton} ${isOpen ? styles.menuButtonOpen : ""}`}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span className={styles.menuBar} />
          <span className={styles.menuBar} />
          <span className={styles.menuBar} />
        </button>
      </div>

      <button
        type="button"
        aria-label="Close menu overlay"
        className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ""}`}
        onClick={closeMenu}
      />

      <ul
        id="mobile-menu"
        className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}
      >
        <li className={styles.drawerItem}>
          <Link href="/" onClick={closeMenu}>
            Home
          </Link>
        </li>
        <li className={styles.drawerItem}>
          <Link href="/Points" onClick={closeMenu}>
            Points
          </Link>
        </li>
        <li className={styles.drawerItem}>
          <button
            type="button"
            aria-label="Search"
            className={styles.drawerSearchButton}
          >
            <img
              className={styles.searchIcon}
              src="/search-solid.svg"
              alt="Search"
            />
          </button>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
