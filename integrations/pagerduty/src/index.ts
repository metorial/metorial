import { Slate } from 'slates';
import { spec } from './spec';
import {
  createIncident,
  getAnalytics,
  getIncident,
  listEscalationPolicies,
  listIncidents,
  listOnCalls,
  listPriorities,
  listSchedules,
  listServices,
  listTeams,
  listUsers,
  manageMaintenanceWindow,
  manageService,
  sendEvent,
  updateIncident
} from './tools';
import { incidentEvents, serviceEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listIncidents,
    getIncident,
    createIncident,
    updateIncident,
    listServices,
    manageService,
    listUsers,
    listOnCalls,
    listEscalationPolicies,
    listSchedules,
    listTeams,
    sendEvent,
    manageMaintenanceWindow,
    getAnalytics,
    listPriorities
  ],
  triggers: [incidentEvents, serviceEvents]
});
