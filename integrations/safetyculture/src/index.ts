import { Slate } from 'slates';
import { spec } from './spec';
import {
  addIssueComment,
  createAction,
  createIssue,
  deleteActions,
  getInspection,
  getIssue,
  getTemplate,
  listActions,
  listIssues,
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
