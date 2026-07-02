import { Slate } from 'slates';
import { spec } from './spec';
import {
  cancelJob,
  copyTable,
  createDataset,
  createRoutine,
  createTable,
  deleteDataset,
  deleteRoutine,
  deleteTable,
  executeQuery,
  exportData,
  getDataset,
  getJob,
  getRoutine,
  getTable,
  insertRows,
  listDatasets,
  listJobs,
  listRoutines,
  listTables,
  loadData,
  readTableData,
  updateDataset,
  updateTable
} from './tools';
import { datasetUpdated, inboundWebhook, jobCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    executeQuery,
    listDatasets,
    getDataset,
    createDataset,
    updateDataset,
    deleteDataset,
    listTables,
    getTable,
    createTable,
    updateTable,
    deleteTable,
    loadData,
    exportData,
    listJobs,
    getJob,
    cancelJob,
    readTableData,
    insertRows,
    copyTable,
    listRoutines,
    getRoutine,
    createRoutine,
    deleteRoutine
  ],
  triggers: [inboundWebhook, jobCompleted, datasetUpdated]
});
