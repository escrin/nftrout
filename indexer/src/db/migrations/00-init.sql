CREATE TABLE progress (
  id INTEGER PRIMARY KEY,
  chain INTEGER UNIQUE,
  block INTEGER NOT NULL
);

CREATE TABLE tokens (
  id INTEGER PRIMARY KEY,

  owner H160 NOT NULL,
  fee U256 DEFAULT NULL,

  self_chain INTEGER NOT NULL,
  self_id    INTEGER NOT NULL,

  version INTEGER NOT NULL CHECK(version > 0),

  name TEXT NOT NULL,

  is_genesis BOOLEAN NOT NULL DEFAULT 0 CHECK(is_genesis = 0 OR is_genesis = 1),
  is_santa   BOOLEAN NOT NULL DEFAULT 0 CHECK(is_santa = 0 OR is_santa = 1),

  left_parent_chain  INTEGER,
  left_parent_id     INTEGER,
  right_parent_chain INTEGER,
  right_parent_id    INTEGER,

  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX ix_tokens_self ON tokens (self_chain, self_id);
CREATE INDEX ix_tokens_left_parent ON tokens (left_parent_chain, left_parent_id);
CREATE INDEX ix_tokens_right_parent ON tokens (right_parent_chain, right_parent_id);
CREATE INDEX ix_tokens_version ON tokens (version);
CREATE INDEX ix_tokens_owner ON tokens (owner);

CREATE TABLE generations (
  token INTEGER NOT NULL REFERENCES tokens(id),
  ord INTEGER NOT NULL CHECK(ord >= 0),
  cid TEXT NOT NULL UNIQUE,
  pinned BOOLEAN NOT NULL DEFAULT 0 CHECK(pinned = 0 OR pinned = 1),
  pin_fails INTEGER NOT NULL DEFAULT 0
);

CREATE UNIQUE INDEX ix_generations_uniq ON generations (token, ord);
CREATE INDEX ix_generations_pinned ON generations (pinned) WHERE pinned = 0;
