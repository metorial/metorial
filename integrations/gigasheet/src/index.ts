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
  getSheet,
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

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
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
    manageSavedFilters
  ],
  triggers: [inboundWebhook]
});
