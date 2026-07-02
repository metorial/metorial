import { Slate } from 'slates';
import { spec } from './spec';
import {
  getErrorDetails,
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
import { checkInEvent, deployEvent, errorEvent, uptimeEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
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
  triggers: [errorEvent, uptimeEvent, checkInEvent, deployEvent]
});
