import { Slate } from 'slates';
import { spec } from './spec';
import {
  createConfiguration,
  deleteConfiguration,
  listConfigurations,
  updateConfiguration
} from './tools/manage-configurations';
import {
  createDatapoint,
  deleteDatapoint,
  getDatapoint,
  listDatapoints,
  updateDatapoint
} from './tools/manage-datapoints';
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
  listRuns,
  updateRun
} from './tools/manage-runs';
import { deleteSession, getSession, startSession } from './tools/manage-sessions';
import { postFeedback } from './tools/post-feedback';

export let provider = Slate.create({
  spec,
  triggers: [],
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
    listDatapoints,
    createDatapoint,
    getDatapoint,
    updateDatapoint,
    deleteDatapoint,
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
    updateRun,
    getRun,
    getRunResult,
    compareRuns,
    deleteRun,
    postFeedback
  ]
});
