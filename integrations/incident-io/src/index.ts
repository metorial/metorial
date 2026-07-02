import { Slate } from 'slates';
import { spec } from './spec';
import {
  createIncident,
  createScheduleOverride,
  editIncident,
  getIncident,
  getScheduleEntries,
  listAlerts,
  listCatalogEntries,
  listCatalogTypes,
  listFollowUps,
  listIncidentRolesAndTypes,
  listIncidents,
  listSchedules,
  listSeveritiesAndStatuses,
  listUsers,
  listWorkflows,
  manageCatalogEntry,
  manageStatusPageIncident,
  sendAlertEvent
} from './tools';
import {
  alertEvents,
  followUpEvents,
  incidentEvents,
  incidentMembershipEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listIncidents,
    getIncident,
    createIncident,
    editIncident,
    listAlerts,
    sendAlertEvent,
    listSchedules,
    getScheduleEntries,
    createScheduleOverride,
    listCatalogTypes,
    listCatalogEntries,
    manageCatalogEntry,
    listSeveritiesAndStatuses,
    listIncidentRolesAndTypes,
    listFollowUps,
    manageStatusPageIncident,
    listUsers,
    listWorkflows
  ],
  triggers: [incidentEvents, followUpEvents, alertEvents, incidentMembershipEvents]
});
