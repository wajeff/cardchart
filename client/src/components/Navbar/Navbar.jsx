"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./Navbar.module.css";
import cardRoutes from "../../cardRoutes";

const normalizeSearchValue = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navbarRef = useRef(null);
  const desktopInputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();
  const normalizedSearchQuery = normalizeSearchValue(searchQuery);
  const hasSearchQuery = normalizedSearchQuery.length > 0;

  const searchResults = useMemo(() => {
    if (!hasSearchQuery) {
      return [];
    }

    return cardRoutes.filter((card) => {
      const haystack = normalizeSearchValue(
        [card.label, card.slug.replaceAll("_", " "), ...(card.searchTerms || [])].join(" "),
      );

      return haystack.includes(normalizedSearchQuery);
    });
  }, [hasSearchQuery, normalizedSearchQuery]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsSearchOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setIsSearchOpen(false);
    setSearchQuery("");
  }, [pathname]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!navbarRef.current?.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!isSearchOpen) {
      return;
    }

    const input = isOpen ? mobileInputRef.current : desktopInputRef.current;
    input?.focus();
  }, [isSearchOpen, isOpen]);

  const closeMenu = () => {
    setIsOpen(false);
    closeSearch();
  };
  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery("");
  };
  const toggleSearch = () => setIsSearchOpen((prev) => !prev);

  const onSearchSubmit = (event) => {
    event.preventDefault();

    if (!searchResults.length) {
      return;
    }

    closeSearch();
    setIsOpen(false);
    router.push(searchResults[0].href);
  };

  const renderSearchResultsList = () => {
    if (!hasSearchQuery) {
      return null;
    }

    return (
      <ul className={styles.searchResults}>
        {searchResults.map((card) => (
          <li key={card.slug}>
            <Link
              href={card.href}
              className={styles.searchResultLink}
              onClick={() => {
                closeSearch();
                closeMenu();
              }}
            >
              <img className={styles.searchResultImage} src={card.src} alt={card.alt} />
              <span className={styles.searchResultLabel}>{card.label}</span>
            </Link>
          </li>
        ))}

        {searchResults.length === 0 ? (
          <li className={styles.searchEmptyState}>No cards found.</li>
        ) : null}
      </ul>
    );
  };

  return (
    <nav className={styles.navbar} ref={navbarRef}>
      <div className={styles.navShell}>
        <ul className={styles.navList}>
          <li className={styles.navItem}>
            <Link href="/">Home</Link>
          </li>
          <li className={styles.navItem}>
            <Link href="/points">Points</Link>
          </li>
        </ul>

        <div className={styles.navActions}>
          <div
            className={`${styles.desktopSearchSlot} ${
              isSearchOpen && !isOpen ? styles.desktopSearchSlotOpen : ""
            }`}
          >
            {isSearchOpen && !isOpen ? (
              <form className={styles.searchForm} onSubmit={onSearchSubmit}>
                <input
                  ref={desktopInputRef}
                  type="search"
                  className={styles.searchInput}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search cards"
                  autoComplete="off"
                />
              </form>
            ) : null}
          </div>

          <button
            type="button"
            className={styles.searchButton}
            aria-label={isSearchOpen ? "Close search" : "Open search"}
            aria-expanded={isSearchOpen}
            onClick={toggleSearch}
          >
            <img
              className={styles.searchIcon}
              src="/search-solid.svg"
              alt="Search"
            />
          </button>

          {isSearchOpen && !isOpen && hasSearchQuery ? (
            <div className={styles.searchTray}>
              <div className={styles.searchTrayInner}>{renderSearchResultsList()}</div>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-controls="mobile-menu"
          aria-expanded={isOpen}
          className={`${styles.menuButton} ${isOpen ? styles.menuButtonOpen : ""}`}
          onClick={() => {
            setIsOpen((prev) => !prev);
            closeSearch();
          }}
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
          <Link href="/points" onClick={closeMenu}>
            Points
          </Link>
        </li>
        <li className={styles.drawerItem}>
          <button
            type="button"
            aria-label={isSearchOpen ? "Close search" : "Open search"}
            className={styles.drawerSearchButton}
            onClick={toggleSearch}
          >
            <img
              className={styles.searchIcon}
              src="/search-solid.svg"
              alt="Search"
            />
          </button>
        </li>

        {isSearchOpen ? (
          <li className={styles.drawerItem}>
            <div className={styles.mobileSearchPanel}>
              <form className={styles.searchForm} onSubmit={onSearchSubmit}>
                <input
                  ref={mobileInputRef}
                  type="search"
                  className={styles.searchInput}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search cards"
                  autoComplete="off"
                />
              </form>
              {renderSearchResultsList()}
            </div>
          </li>
        ) : null}
      </ul>
    </nav>
  );
};

export default Navbar;
