import { Slate } from 'slates';
import { spec } from './spec';
import {
  listProjects,
  listResources,
  listServices,
  manageAddon,
  manageJob,
  manageNotificationIntegration,
  manageProject,
  manageSecret,
  manageService,
  runTemplate
} from './tools';
import { platformEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    manageProject,
    listServices,
    manageService,
    manageJob,
    manageAddon,
    manageSecret,
    listResources,
    runTemplate,
    manageNotificationIntegration
  ],
  triggers: [platformEvents]
});
