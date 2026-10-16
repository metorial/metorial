import { Slate } from 'slates';
import { spec } from './spec';
import {
  createWebhook,
  getApp,
  getAppResults,
  getJob,
  getUserInfo,
  listApps,
  listLanguages,
  listProjects,
  listReferenceData,
  listTemplates,
  listWebhooks,
  runJob,
  useTemplate
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listApps,
    getApp,
    runJob,
    getJob,
    getAppResults,
    listTemplates,
    useTemplate,
    listReferenceData,
    listProjects,
    getUserInfo,
    listLanguages,
    listWebhooks,
    createWebhook
  ],
  triggers: []
});
