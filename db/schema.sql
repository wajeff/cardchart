-- CardChart schema (Postgres / Neon). Safe to run more than once.

CREATE TABLE IF NOT EXISTS promotions (
  id                        BIGSERIAL PRIMARY KEY,
  card                      TEXT          NOT NULL,
  scraped_at                TIMESTAMPTZ   NOT NULL DEFAULT now(),
  total_points              INTEGER       NOT NULL,
  total_spend_required      INTEGER       NOT NULL,
  promotion_duration_months INTEGER       NOT NULL,
  total_membership_fee      NUMERIC(10,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS promotions_card_scraped_at_idx
  ON promotions (card, scraped_at);

CREATE TABLE IF NOT EXISTS alert_subscribers (
  email      TEXT        PRIMARY KEY,
  is_active  BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
