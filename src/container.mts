// Copyright (C) 2026 - present Juergen Zimmermann, Hochschule Karlsruhe
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

import { DbPopulateService } from './config/dev/db-populate.mts';
import { AppProfileService } from './reclaim/service/app-profile-service.mts';
import { AppProfileWriteService } from './reclaim/service/app-profile-write-service.mts';
import { KeycloakService } from './security/keycloak-service.mts';

const appProfileService = new AppProfileService();

/**
 * Container mit Singletons zur Emulation von manueller DI (ähnlich wie ein
 * Container beim Spring Framework.
 */
export const container = {
    appProfileService,
    appProfileWriteService: new AppProfileWriteService(appProfileService),
    keycloakService: new KeycloakService(),
    dbPopulateService: new DbPopulateService(),
};
