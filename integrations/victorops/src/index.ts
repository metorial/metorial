import { Slate } from 'slates';
import { spec } from './spec';
import {
  createIncident,
  createOnCallOverride,
  deleteRoutingKey,
  getIncident,
  getOnCall,
  getShiftLog,
  getTeamRotations,
  listChatMessages,
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
export let provider = Slate.create({
  spec,
  tools: [
    getIncident,
    deleteRoutingKey,
    listChatMessages,
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
  triggers: []
});
