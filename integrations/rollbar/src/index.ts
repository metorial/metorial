import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDeploy,
  getItem,
  getMetrics,
  getOccurrence,
  getVersion,
  listDeploys,
  listEnvironments,
  listItems,
  listOccurrences,
  listUsers,
  manageAccessTokens,
  manageNotificationRules,
  manageProject,
  manageServiceLinks,
  manageTeam,
  manageTeamMembers,
  manageTeamProjects,
  runRqlQuery,
  updateItem
} from './tools';
import { deployEvent, itemEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listItems,
    getItem,
    updateItem,
    listOccurrences,
    getOccurrence,
    createDeploy,
    listDeploys,
    manageProject,
    manageTeam,
    manageTeamMembers,
    manageTeamProjects,
    runRqlQuery,
    getMetrics,
    manageNotificationRules,
    listEnvironments,
    manageAccessTokens,
    manageServiceLinks,
    listUsers,
    getVersion
  ],
  triggers: [itemEvent, deployEvent]
});
