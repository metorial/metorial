import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCall,
  deleteLead,
  getCall,
  getLead,
  getTeam,
  listAgents,
  listCalls,
  listClients,
  listLeads,
  listTeams,
  manageAgent,
  manageAgentSchedule,
  manageClient,
  manageTeam,
  manageTeamAgents,
  sendSms,
  updateLead
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createCall,
    getCall,
    listCalls,
    listLeads,
    getLead,
    updateLead,
    deleteLead,
    sendSms,
    listTeams,
    getTeam,
    manageTeam,
    manageAgent,
    listAgents,
    manageAgentSchedule,
    manageTeamAgents,
    manageClient,
    listClients
  ],
  triggers: []
});
