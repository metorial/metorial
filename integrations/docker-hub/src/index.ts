import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAccessToken,
  createRepository,
  createTeam,
  createWebhook,
  deleteAccessToken,
  deleteRepository,
  deleteTag,
  deleteTeam,
  deleteWebhook,
  getRepository,
  listAccessTokens,
  listAuditLogActions,
  listAuditLogs,
  listOrgMembers,
  listRepositories,
  listTags,
  listTeams,
  listWebhooks,
  manageTeamMembers,
  removeOrgMember,
  searchRepositories,
  updateAccessToken,
  updateRepository
} from './tools';
import { imagePush } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listRepositories,
    getRepository,
    createRepository,
    updateRepository,
    deleteRepository,
    listTags,
    deleteTag,
    searchRepositories,
    listOrgMembers,
    removeOrgMember,
    listTeams,
    createTeam,
    deleteTeam,
    manageTeamMembers,
    listWebhooks,
    createWebhook,
    deleteWebhook,
    listAccessTokens,
    createAccessToken,
    updateAccessToken,
    deleteAccessToken,
    listAuditLogs,
    listAuditLogActions
  ],
  triggers: [imagePush]
});
