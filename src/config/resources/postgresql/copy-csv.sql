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

-- Aufruf:   psql --dbname=reclaim --username=postgres --file=/init/reclaim/sql/copy-csv.sql

SET search_path TO reclaim;

COPY app_profile (id, display_name, avatar_url, status_message, timezone, current_streak, onboarding_completed, version, erzeugt, aktualisiert) 
FROM '/init/reclaim/csv/app_profile.csv' (FORMAT csv, DELIMITER ';', HEADER true);

COPY screentime_log (id, log_date, total_minutes, top_app, profile_id, erzeugt, aktualisiert) 
FROM '/init/reclaim/csv/screentime_log.csv' (FORMAT csv, DELIMITER ';', HEADER true);

COPY tracking_config (id, daily_limit_minutes, is_public, notifications_enabled, profile_id, erzeugt, aktualisiert) 
FROM '/init/reclaim/csv/tracking_config.csv' (FORMAT csv, DELIMITER ';', HEADER true);
