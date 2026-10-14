import { Slate } from 'slates';
import { spec } from './spec';
import {
  aiAssistant,
  createSheet,
  crossFileLookup,
  deduplicateRows,
  downloadExport,
  enrichData,
  exportSheet,
  filterData,
  findAndReplace,
  getActivity,
  getCurrentUser,
  getFileUrl,
  getSheet,
  listExports,
  listFiles,
  manageColumns,
  manageComments,
  manageFile,
  manageSavedFilters,
  manageViews,
  modifyRows,
  runFormula,
  shareFile
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    listExports,
    listFiles,
    getSheet,
    createSheet,
    manageFile,
    filterData,
    modifyRows,
    manageColumns,
    exportSheet,
    downloadExport,
    shareFile,
    runFormula,
    findAndReplace,
    manageViews,
    manageComments,
    aiAssistant,
    crossFileLookup,
    deduplicateRows,
    enrichData,
    getActivity,
    getCurrentUser,
    getFileUrl,
    manageSavedFilters
  ],
  triggers: []
});
