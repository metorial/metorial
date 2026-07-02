import { Slate } from 'slates';
import { spec } from './spec';
import {
  alertAction,
  createAlert,
  createIncident,
  getAlert,
  getIncident,
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
    createIncident,
    getIncident,
    listIncidents,
    incidentAction,
    manageSchedule,
    listSchedules,
    getOnCall,
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
