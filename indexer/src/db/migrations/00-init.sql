CREATE TABLE tokens (
  self_chain INTEGER,
  self_id    INTEGER,

  token_cid TEXT NOT NULL,
  image_cid TEXT NOT NULL,

  name TEXT NOT NULL,

  is_genesis BOOLEAN NOT NULL DEFAULT 0 CHECK(is_genesis = 0 OR is_genesis = 1),
  is_santa   BOOLEAN NOT NULL DEFAULT 0 CHECK(is_santa = 0 OR is_santa = 1),

  version INTEGER NOT NULL,

  generations JSON NOT NULL DEFAULT '[]',

  left_parent_chain  INTEGER,
  left_parent_id     INTEGER,
  right_parent_chain INTEGER,
  right_parent_id    INTEGER,

  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (self_chain, self_id)
);

CREATE INDEX ix_left_parent  ON tokens (left_parent_chain,  left_parent_id);
CREATE INDEX ix_right_parent ON tokens (right_parent_chain, right_parent_id);
CREATE INDEX ix_version ON tokens (version);
