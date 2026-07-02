import { Slate } from 'slates';
import { spec } from './spec';
import {
  createIncident,
  createOnCallOverride,
  getOnCall,
  getShiftLog,
  getTeamRotations,
  listIncidents,
  manageEscalationPolicy,
  manageIncident,
  manageIncidentNotes,
  manageMaintenanceMode,
  manageRoutingKeys,
  manageTeam,
  manageUser,
  searchIncidentHistory,
  sendChatMessage
} from './tools';
import { incidentEvents, incidentWebhook, onCallChange } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listIncidents,
    createIncident,
    manageIncident,
    manageIncidentNotes,
    getOnCall,
    createOnCallOverride,
    manageUser,
    manageTeam,
    manageEscalationPolicy,
    manageRoutingKeys,
    manageMaintenanceMode,
    searchIncidentHistory,
    sendChatMessage,
    getTeamRotations,
    getShiftLog
  ],
  triggers: [incidentEvents, incidentWebhook, onCallChange]
});
