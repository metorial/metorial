import { Slate } from 'slates';
import { spec } from './spec';
import {
  addCaseComment,
  executeConnector,
  exportSavedObjects,
  getEnrollmentTokens,
  getKibanaStatus,
  listAgentPolicies,
  listConnectors,
  listDataViews,
  listFleetAgents,
  listRoles,
  listSpaces,
  manageAgentPolicy,
  manageCase,
  manageConnector,
  manageDataView,
  manageRole,
  manageRule,
  manageSavedObject,
  manageSLO,
  manageSpace,
  searchCases,
  searchRules,
  searchSavedObjects,
  searchSLOs
} from './tools';
import { caseChanges, inboundWebhook, ruleStatusChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    searchSavedObjects,
    manageSavedObject,
    exportSavedObjects,
    listDataViews,
    manageDataView,
    listSpaces,
    manageSpace,
    searchRules,
    manageRule,
    listConnectors,
    manageConnector,
    executeConnector,
    searchCases,
    manageCase,
    addCaseComment,
    searchSLOs,
    manageSLO,
    listAgentPolicies,
    manageAgentPolicy,
    listFleetAgents,
    getEnrollmentTokens,
    listRoles,
    manageRole,
    getKibanaStatus
  ],
  triggers: [inboundWebhook, ruleStatusChanges, caseChanges]
});
