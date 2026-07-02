import { Slate } from 'slates';
import { spec } from './spec';
import {
  createScenario,
  getScenarioLogs,
  getUsage,
  listConnections,
  listDataStores,
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
import { inboundWebhook, scenarioExecution } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [inboundWebhook, scenarioExecution]
});
