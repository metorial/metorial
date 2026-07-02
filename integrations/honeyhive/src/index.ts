import { Slate } from 'slates';
import { spec } from './spec';
import {
  createConfiguration,
  deleteConfiguration,
  listConfigurations,
  updateConfiguration
} from './tools/manage-configurations';
import {
  addDatapointsToDataset,
  createDataset,
  deleteDataset,
  listDatasets,
  updateDataset
} from './tools/manage-datasets';
import {
  deleteEvent,
  getEvent,
  logEvent,
  logEventBatch,
  queryEvents,
  updateEvent
} from './tools/manage-events';
import { createMetric, deleteMetric, listMetrics, updateMetric } from './tools/manage-metrics';
import {
  createProject,
  deleteProject,
  listProjects,
  updateProject
} from './tools/manage-projects';
import {
  compareRuns,
  createRun,
  deleteRun,
  getRun,
  getRunResult,
  listRuns
} from './tools/manage-runs';
import { deleteSession, getSession, startSession } from './tools/manage-sessions';
import { postFeedback } from './tools/post-feedback';
import { inboundWebhook } from './triggers/inbound-webhook';
import { newEvents } from './triggers/new-events';

export let provider = Slate.create({
  spec,
  tools: [
    listProjects,
    createProject,
    updateProject,
    deleteProject,
    startSession,
    getSession,
    deleteSession,
    logEvent,
    updateEvent,
    logEventBatch,
    queryEvents,
    getEvent,
    deleteEvent,
    listDatasets,
    createDataset,
    updateDataset,
    deleteDataset,
    addDatapointsToDataset,
    listConfigurations,
    createConfiguration,
    updateConfiguration,
    deleteConfiguration,
    listMetrics,
    createMetric,
    updateMetric,
    deleteMetric,
    listRuns,
    createRun,
    getRun,
    getRunResult,
    compareRuns,
    deleteRun,
    postFeedback
  ],
  triggers: [inboundWebhook, newEvents]
});
