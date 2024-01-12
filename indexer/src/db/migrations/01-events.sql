CREATE TABLE event_kinds (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

INSERT INTO event_kinds (id, name) VALUES (1, 'spawn');
INSERT INTO event_kinds (id, name) VALUES (2, 'list');
INSERT INTO event_kinds (id, name) VALUES (3, 'transfer');

CREATE TABLE events (
  id INTEGER PRIMARY KEY,
  kind INTEGER NOT NULL REFERENCES event_kinds(id),
  token INTEGER NOT NULL, -- REFERENCES tokens(id

  block INTEGER NOT NULL,
  log_index INTEGER NOT NULL
);

CREATE UNIQUE INDEX ix_events_uniq ON events (block, log_index);
CREATE INDEX ix_events_token ON events (token);

CREATE TABLE spawn_events (
  event INTEGER PRIMARY KEY REFERENCES events(id),
  recipient H160 NOT NULL
);

CREATE TABLE list_events (
  event INTEGER PRIMARY KEY REFERENCES events(id),
  fee U256
);

CREATE TABLE transfer_events (
  event INTEGER PRIMARY KEY REFERENCES events(id),
  sender H160 NOT NULL,
  recipient H160 NOT NULL
);

CREATE TABLE progress (
  chain INTEGER PRIMARY KEY NOT NULL UNIQUE,
  block INTEGER NOT NULL
);

INSERT INTO progress (chain, block) VALUES (23294, 410435);
