"use client";

import { useState } from "react";
import styles from "./AlertsSignup.module.css";

const initialState = {
  status: "idle",
  message: "",
};

const AlertsSignup = ({ className = "", fullWidth = false }) => {
  const [email, setEmail] = useState("");
  const [submission, setSubmission] = useState(initialState);

  const onSubmit = async (event) => {
    event.preventDefault();

    setSubmission({
      status: "loading",
      message: "Submitting...",
    });

    try {
      const response = await fetch("/api/alerts-subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "Could not subscribe.");
      }

      setSubmission({
        status: "success",
        message: payload.message || "You are subscribed.",
      });
      setEmail("");
    } catch (error) {
      setSubmission({
        status: "error",
        message: error.message || "Could not subscribe.",
      });
    }
  };

  return (
    <section
      className={[
        styles.signupCard,
        fullWidth ? styles.fullWidth : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className={styles.copyBlock}>
        <h3 className={styles.title}>Promotion alerts</h3>
        <p className={styles.description}>
          Get an email when Card Chart detects a new promotion entry.
        </p>
      </div>

      <form className={styles.form} onSubmit={onSubmit}>
        <input
          className={styles.input}
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
        <button
          className={styles.button}
          type="submit"
          disabled={submission.status === "loading"}
        >
          {submission.status === "loading" ? "Submitting..." : "Subscribe"}
        </button>
      </form>

      {submission.message ? (
        <p
          className={
            submission.status === "error" ? styles.errorMessage : styles.successMessage
          }
        >
          {submission.message}
        </p>
      ) : null}
    </section>
  );
};

export default AlertsSignup;
