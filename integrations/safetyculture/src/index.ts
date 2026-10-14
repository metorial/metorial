import { Slate } from 'slates';
import { spec } from './spec';
import {
  addIssueComment,
  createAction,
  createIssue,
  deleteActions,
  getConnections,
  getFileUrl,
  getInspection,
  getIssue,
  getTemplate,
  listActions,
  listAssetTypes,
  listIssues,
  listSites,
  listTemplates,
  listUsersAndGroups,
  manageAssets,
  manageInspection,
  manageSchedules,
  searchInspections,
  updateAction,
  updateIssue
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getConnections,
    listSites,
    listAssetTypes,
    getFileUrl,
    searchInspections,
    getInspection,
    manageInspection,
    listTemplates,
    getTemplate,
    listActions,
    createAction,
    updateAction,
    deleteActions,
    listIssues,
    getIssue,
    createIssue,
    updateIssue,
    addIssueComment,
    listUsersAndGroups,
    manageSchedules,
    manageAssets
  ],
  triggers: []
});
