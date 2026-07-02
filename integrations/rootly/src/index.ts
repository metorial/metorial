import { Slate } from 'slates';
import { spec } from './spec';
import {
  createActionItem,
  createAlert,
  createHeartbeat,
  createIncident,
  getIncident,
  listActionItems,
  listAlerts,
  listEnvironments,
  listEscalationPolicies,
  listHeartbeats,
  listIncidents,
  listOnCall,
  listSchedules,
  listServices,
  listSeverities,
  listTeams,
  listUsers,
  listWorkflows,
  manageAlert,
  updateActionItem,
  updateIncident
} from './tools';
import {
  alertEvents,
  incidentEvents,
  retrospectiveEvents,
  scheduledIncidentEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listIncidents,
    getIncident,
    createIncident,
    updateIncident,
    listAlerts,
    createAlert,
    manageAlert,
    listOnCall,
    listSchedules,
    listEscalationPolicies,
    listServices,
    listTeams,
    listUsers,
    listActionItems,
    createActionItem,
    updateActionItem,
    listHeartbeats,
    createHeartbeat,
    listWorkflows,
    listSeverities,
    listEnvironments
  ],
  triggers: [incidentEvents, alertEvents, retrospectiveEvents, scheduledIncidentEvents]
});
