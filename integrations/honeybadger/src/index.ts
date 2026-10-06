import { Slate } from 'slates';
import { spec } from './spec';
import {
  getErrorDetails,
  listAccounts,
  listOutages,
  listProjects,
  manageCheckIns,
  manageDeployments,
  manageEnvironments,
  manageError,
  manageProject,
  manageTeams,
  manageUptime,
  queryInsights,
  reportCheckIn,
  reportError,
  searchErrors,
  sendEvents
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    listAccounts,
    manageProject,
    searchErrors,
    getErrorDetails,
    manageError,
    manageUptime,
    listOutages,
    manageCheckIns,
    manageDeployments,
    manageTeams,
    queryInsights,
    sendEvents,
    reportCheckIn,
    reportError,
    manageEnvironments
  ],
  triggers: []
});
