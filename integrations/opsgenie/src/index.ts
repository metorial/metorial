import { Slate } from 'slates';
import { spec } from './spec';
import {
  alertAction,
  createAlert,
  createIncident,
  getAlert,
  getAlertRequestStatus,
  getIncident,
  getIncidentRequestStatus,
  getOnCall,
  getTeam,
  getUser,
  incidentAction,
  listAlerts,
  listEscalations,
  listIncidents,
  listSchedules,
  listServices,
  listTeams,
  listUsers,
  manageEscalation,
  manageSchedule,
  manageScheduleOverride,
  manageService,
  manageTeam,
  manageUser,
  updateAlert
} from './tools';
import { alertActivityTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createAlert,
    getAlert,
    listAlerts,
    updateAlert,
    alertAction,
    getAlertRequestStatus,
    createIncident,
    getIncident,
    listIncidents,
    incidentAction,
    getIncidentRequestStatus,
    manageSchedule,
    listSchedules,
    getOnCall,
    manageScheduleOverride,
    manageEscalation,
    listEscalations,
    manageTeam,
    listTeams,
    getTeam,
    manageUser,
    listUsers,
    getUser,
    manageService,
    listServices
  ],
  triggers: [alertActivityTrigger]
});
