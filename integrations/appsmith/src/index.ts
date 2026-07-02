import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkHealth,
  exportApplication,
  getCurrentUser,
  getInstanceInfo,
  importApplication,
  listApplications,
  listDatasources,
  listPages,
  listWorkspaces,
  manageApplication,
  manageWorkspace,
  queryAuditLogs,
  triggerWorkflow
} from './tools';
import { workflowEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    checkHealth,
    getInstanceInfo,
    triggerWorkflow,
    listWorkspaces,
    manageWorkspace,
    listApplications,
    manageApplication,
    exportApplication,
    importApplication,
    listPages,
    listDatasources,
    queryAuditLogs,
    getCurrentUser
  ],
  triggers: [workflowEvent]
});
