import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteAgent,
  deleteRepoBlocklist,
  downloadArtifact,
  followUpAgent,
  getAgent,
  getApiKeyInfo,
  getAuditLogs,
  getConversation,
  getDailyUsage,
  getRepoBlocklists,
  getSpend,
  getTeamMembers,
  getUsageEvents,
  launchAgent,
  listAgentArtifacts,
  listAgents,
  listModels,
  listRepositories,
  removeTeamMember,
  setSpendLimit,
  stopAgent,
  upsertRepoBlocklists
} from './tools';
import { agentStatusChange } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    launchAgent,
    getAgent,
    listAgents,
    followUpAgent,
    stopAgent,
    deleteAgent,
    getConversation,
    listAgentArtifacts,
    downloadArtifact,
    listRepositories,
    listModels,
    getApiKeyInfo,
    getTeamMembers,
    removeTeamMember,
    setSpendLimit,
    getDailyUsage,
    getSpend,
    getUsageEvents,
    getAuditLogs,
    getRepoBlocklists,
    upsertRepoBlocklists,
    deleteRepoBlocklist
  ],
  triggers: [agentStatusChange]
});
