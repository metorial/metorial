import { Slate } from 'slates';
import { spec } from './spec';
import {
  createScenario,
  downloadBlueprint,
  getCurrentUser,
  getExecutionStatus,
  getScenarioLogs,
  getUsage,
  listConnections,
  listDataStores,
  listDataStructures,
  listHooks,
  listOrganizations,
  listScenarios,
  listTeams,
  listUsers,
  manageConnection,
  manageDataStore,
  manageDataStoreRecords,
  manageHook,
  manageScenario
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    listDataStructures,
    getExecutionStatus,
    downloadBlueprint,
    listScenarios,
    manageScenario,
    createScenario,
    listConnections,
    manageConnection,
    listDataStores,
    manageDataStore,
    manageDataStoreRecords,
    listHooks,
    manageHook,
    listOrganizations,
    listTeams,
    listUsers,
    getScenarioLogs,
    getUsage
  ],
  triggers: []
});
