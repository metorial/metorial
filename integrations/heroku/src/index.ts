import { Slate } from '@slates/provider';
import { spec } from './spec';
import {
  createApp,
  createLogSession,
  deleteApp,
  getAccount,
  getApp,
  listApps,
  manageAddons,
  manageBuildpacks,
  manageBuilds,
  manageCollaborators,
  manageConfigVars,
  manageDomains,
  manageDynos,
  manageLogDrains,
  managePipelines,
  manageReleases,
  scaleFormation,
  updateApp
} from './tools';
import { appWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listApps,
    getApp,
    createApp,
    updateApp,
    deleteApp,
    manageDynos,
    scaleFormation,
    manageAddons,
    manageConfigVars,
    manageBuilds,
    manageBuildpacks,
    manageReleases,
    manageDomains,
    manageCollaborators,
    managePipelines,
    manageLogDrains,
    createLogSession,
    getAccount
  ],
  triggers: [appWebhook]
});
