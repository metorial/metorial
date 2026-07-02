import { Slate } from 'slates';
import { spec } from './spec';
import {
  getApp,
  getAppResults,
  getJob,
  getUserInfo,
  listApps,
  listProjects,
  listReferenceData,
  listTemplates,
  runJob,
  useTemplate
} from './tools';
import { jobCompleted, rowCompleted } from './triggers';

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
    getUserInfo
  ],
  triggers: [jobCompleted, rowCompleted]
});
