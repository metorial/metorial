import { Slate } from 'slates';
import { spec } from './spec';
import {
  executeQuery,
  exportQuestionResults,
  getCurrentUser,
  getTableMetadata,
  listDashboards,
  listQuestions,
  manageAlert,
  manageCollection,
  manageDashboard,
  manageDashboardCards,
  manageDatabase,
  managePermissions,
  managePublicLink,
  manageQuestion,
  manageUser,
  searchMetabase
} from './tools';
import { alertWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageQuestion,
    listQuestions,
    executeQuery,
    exportQuestionResults,
    getCurrentUser,
    getTableMetadata,
    manageDashboard,
    listDashboards,
    manageDashboardCards,
    manageCollection,
    manageDatabase,
    searchMetabase,
    manageUser,
    managePermissions,
    manageAlert,
    managePublicLink
  ],
  triggers: [alertWebhook]
});
