import { Slate } from 'slates';
import { spec } from './spec';
import {
  addRows,
  addUser,
  createSheet,
  createUpdateRequest,
  createWorkspace,
  deleteRows,
  deleteSheet,
  deleteWorkspace,
  getCurrentUser,
  getSheet,
  getWorkspace,
  listDashboards,
  listReports,
  listSheets,
  listUsers,
  listWorkspaces,
  manageColumns,
  manageDiscussions,
  manageFolders,
  search,
  sendSheetEmail,
  shareResource,
  updateRows,
  updateSheet
} from './tools';
import { sheetChanges } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listSheets,
    getSheet,
    createSheet,
    updateSheet,
    deleteSheet,
    addRows,
    updateRows,
    deleteRows,
    manageColumns,
    listWorkspaces,
    getWorkspace,
    createWorkspace,
    deleteWorkspace,
    manageFolders,
    shareResource,
    search,
    manageDiscussions,
    listUsers,
    getCurrentUser,
    addUser,
    sendSheetEmail,
    listReports,
    listDashboards,
    createUpdateRequest
  ],
  triggers: [sheetChanges]
});
