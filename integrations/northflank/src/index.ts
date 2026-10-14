import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAuthInfo,
  listProjects,
  listResources,
  listServices,
  listTeams,
  manageAddon,
  manageJob,
  manageNotificationIntegration,
  manageProject,
  manageSecret,
  manageService,
  restartService,
  runTemplate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getAuthInfo,
    listTeams,
    listProjects,
    manageProject,
    listServices,
    manageService,
    restartService,
    manageJob,
    manageAddon,
    manageSecret,
    listResources,
    runTemplate,
    manageNotificationIntegration
  ],
  triggers: []
});
