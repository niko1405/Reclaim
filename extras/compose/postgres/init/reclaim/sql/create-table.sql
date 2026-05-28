-- Copyright (C) 2022 - present Juergen Zimmermann, Hochschule Karlsruhe
--
-- This program is free software: you can redistribute it and/or modify
-- it under the terms of the GNU General Public License as published by
-- the Free Software Foundation, either version 3 of the License, or
-- (at your option) any later version.
--
-- This program is distributed in the hope that it will be useful,
-- but WITHOUT ANY WARRANTY; without even the implied warranty of
-- MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
-- GNU General Public License for more details.
--
-- You should have received a copy of the GNU General Public License
-- along with this program.  If not, see <https://www.gnu.org/licenses/>.

-- Aufruf:   psql --dbname=reclaim --username=reclaim --file=/init/reclaim/sql/create-table.sql

-- text statt varchar(n):
-- "There is no performance difference among these three types, apart from a few extra CPU cycles
-- to check the length when storing into a length-constrained column"
-- ggf. CHECK(char_length(nachname) <= 255)

-- Indexe auflisten:
-- psql --dbname=reclaim --username=reclaim
--  SELECT   tablename, indexname, indexdef, tablespace
--  FROM     pg_indexes
--  WHERE    schemaname = 'reclaim'
--  ORDER BY tablename, indexname;
--  \q

-- https://www.postgresql.org/docs/current/manage-ag-tablespaces.html
SET default_tablespace = reclaimspace;

-- https://www.postgresql.org/docs/current/app-psql.html
-- https://www.postgresql.org/docs/current/ddl-schemas.html
-- https://www.postgresql.org/docs/current/ddl-schemas.html#DDL-SCHEMAS-CREATE
-- "user-private schema" (Default-Schema: public)
CREATE SCHEMA IF NOT EXISTS AUTHORIZATION reclaim;

ALTER ROLE reclaim SET search_path = 'reclaim';
set search_path to 'reclaim';

CREATE TABLE IF NOT EXISTS app_profile (
                  -- Keycloak Subject-ID (UUID), daher kein auto-increment Integer
                  -- https://www.postgresql.org/docs/current/datatype-uuid.html
    id                   uuid PRIMARY KEY,
    display_name         text NOT NULL,
    avatar_url           text,
    status_message       text,
    timezone             text NOT NULL DEFAULT 'Europe/Berlin',
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-CHECK-CONSTRAINTS
    current_streak       integer NOT NULL DEFAULT 0 CHECK (current_streak >= 0),
                  -- https://www.postgresql.org/docs/current/datatype-boolean.html
    onboarding_completed boolean NOT NULL DEFAULT FALSE,
                  -- https://www.postgresql.org/docs/current/datatype-datetime.html
    version              integer NOT NULL DEFAULT 0,
    erzeugt              timestamp NOT NULL DEFAULT NOW(),
    aktualisiert         timestamp NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS tracking_config (
                  -- https://www.postgresql.org/docs/current/datatype-numeric.html#DATATYPE-INT
                  -- "GENERATED ALWAYS AS IDENTITY" gemaess SQL-Standard
    id                    integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
    daily_limit_minutes   integer NOT NULL DEFAULT 120 CHECK (daily_limit_minutes > 0),
    is_public             boolean NOT NULL DEFAULT FALSE,
    notifications_enabled boolean NOT NULL DEFAULT TRUE,
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK
                  -- 1:1 Beziehung durch UNIQUE Constraint auf den Foreign Key
    profile_id            uuid NOT NULL UNIQUE REFERENCES app_profile ON DELETE CASCADE,
    erzeugt               timestamp NOT NULL DEFAULT NOW(),
    aktualisiert          timestamp NOT NULL DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS screentime_log (
    id                    integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
                  -- https://www.postgresql.org/docs/current/datatype-datetime.html
    log_date              date NOT NULL,
                  -- Ein Tag hat maximal 1440 Minuten
    total_minutes         integer NOT NULL CHECK (total_minutes >= 0 AND total_minutes <= 1440),
    top_app               text,
                  -- 1:n Beziehung (ohne UNIQUE, da ein Profil viele Logs hat)
    profile_id            uuid NOT NULL REFERENCES app_profile ON DELETE CASCADE,
    erzeugt               timestamp NOT NULL DEFAULT NOW(),
    aktualisiert          timestamp NOT NULL DEFAULT NOW(),
                  -- Verhindert, dass für denselben Nutzer am selben Tag zwei Einträge entstehen
    UNIQUE (profile_id, log_date)
);

-- Implizite Indizes entstehen nur bei PRIMARY KEY und UNIQUE. 
-- Für normale Foreign Keys zur Beschleunigung von JOINs legen wir sie explizit an:
CREATE INDEX IF NOT EXISTS screentime_log_profile_id_idx ON screentime_log(profile_id);

CREATE TABLE IF NOT EXISTS profile_avatar (
                  -- Wie in deiner Vorlage: Standard-konforme ID-Generierung
    id              integer GENERATED ALWAYS AS IDENTITY(START WITH 1000) PRIMARY KEY,
                  -- https://www.postgresql.org/docs/current/datatype-binary.html
                  -- Speichert die rohen Bilddaten als Binärstring in der Datenbank
    file_data       bytea NOT NULL,
    filename        text NOT NULL,
                  -- Erweitert um einen CHECK, damit nur echte Bilder hochgeladen werden
    mimetype        text NOT NULL CHECK (mimetype IN ('image/jpeg', 'image/png', 'image/webp')),
                  -- Dateigröße in Bytes (hilfreich für spätere Quota-Limits)
    file_size_bytes integer NOT NULL CHECK (file_size_bytes > 0),
                  -- https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK
                  -- UNIQUE garantiert die 1:1-Beziehung: Ein Profil hat maximal ein Avatar-Bild
    profile_id      uuid NOT NULL UNIQUE REFERENCES app_profile ON DELETE CASCADE,
                  -- Zeitstempel
    erzeugt         timestamp NOT NULL DEFAULT NOW(),
    aktualisiert    timestamp NOT NULL DEFAULT NOW()
);

-- Index für den Foreign Key (wichtig für schnelle Ladezeiten beim Profilaufruf)
CREATE INDEX IF NOT EXISTS profile_avatar_profile_id_idx ON profile_avatar(profile_id);
