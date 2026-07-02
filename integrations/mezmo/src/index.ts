import { Slate } from 'slates';
import { spec } from './spec';
import {
  configureArchiving,
  createBoard,
  createExclusionRule,
  createPresetAlert,
  createView,
  deleteArchiveConfig,
  deleteBoard,
  deleteExclusionRule,
  deletePresetAlert,
  deleteView,
  getArchiveConfig,
  getIngestionStatus,
  getUsage,
  ingestLogs,
  listBoards,
  listExclusionRules,
  listPresetAlerts,
  listViews,
  resumeIngestion,
  searchLogs,
  suspendIngestion,
  updateExclusionRule,
  updatePresetAlert,
  updateView
} from './tools';
import { logAlert } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    ingestLogs,
    searchLogs,
    listViews,
    createView,
    updateView,
    deleteView,
    listPresetAlerts,
    createPresetAlert,
    updatePresetAlert,
    deletePresetAlert,
    listExclusionRules,
    createExclusionRule,
    updateExclusionRule,
    deleteExclusionRule,
    listBoards,
    createBoard,
    deleteBoard,
    getUsage,
    getIngestionStatus,
    suspendIngestion,
    resumeIngestion,
    getArchiveConfig,
    configureArchiving,
    deleteArchiveConfig
  ],
  triggers: [logAlert]
});
