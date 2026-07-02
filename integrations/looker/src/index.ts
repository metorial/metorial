import { Slate } from 'slates';
import { spec } from './spec';
import {
  createEmbedUrl,
  listModels,
  listRoles,
  manageAlert,
  manageConnection,
  manageDashboard,
  manageFolder,
  manageGroup,
  manageLook,
  manageScheduledPlan,
  manageUser,
  runQuery,
  runSqlQuery,
  searchDashboards,
  searchLooks,
  validateContent
} from './tools';
import { dashboardActivity, inboundWebhook, lookActivity } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    runQuery,
    runSqlQuery,
    searchDashboards,
    manageDashboard,
    manageLook,
    searchLooks,
    manageFolder,
    manageUser,
    manageGroup,
    listRoles,
    manageScheduledPlan,
    manageAlert,
    listModels,
    manageConnection,
    createEmbedUrl,
    validateContent
  ],
  triggers: [inboundWebhook, dashboardActivity, lookActivity]
});
