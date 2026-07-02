import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCall,
  deleteLead,
  getCall,
  getLead,
  listAgents,
  listCalls,
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
import { callCompleted, leadCreated, leadUpdated } from './triggers';

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
    manageTeam,
    manageAgent,
    listAgents,
    manageAgentSchedule,
    manageTeamAgents,
    manageClient
  ],
  triggers: [callCompleted, leadCreated, leadUpdated]
});
