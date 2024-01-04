CREATE TABLE pending_tokens (
  id INTEGER PRIMARY KEY,

  self_chain INTEGER NOT NULL,
  self_id    INTEGER NOT NULL,

  left_parent_chain  INTEGER DEFAULT NULL,
  left_parent_id     INTEGER DEFAULT NULL,
  right_parent_chain INTEGER DEFAULT NULL,
  right_parent_id    INTEGER DEFAULT NULL,

  owner H160 NOT NULL
);

CREATE UNIQUE INDEX ix_pending_tokens_self ON tokens (self_chain, self_id);

CREATE TRIGGER delete_pending_tokens
AFTER INSERT ON tokens
FOR EACH ROW
BEGIN
  DELETE FROM pending_tokens
   WHERE self_chain = NEW.self_chain
     AND self_id = NEW.self_id;
END;
