import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadResults,
  getCurrentAccount,
  getReport,
  getReportRun,
  listCollections,
  listDataSources,
  listDatasets,
  listDefinitions,
  listMembers,
  listReportRuns,
  listReportSchedules,
  listReports,
  manageCollection,
  manageDataset,
  manageDefinition,
  manageQuery,
  manageReport,
  manageReportSchedule,
  runReport
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentAccount,
    downloadResults,
    getReport,
    listReports,
    manageReport,
    manageQuery,
    runReport,
    getReportRun,
    listReportRuns,
    listCollections,
    manageCollection,
    listDatasets,
    manageDataset,
    listDataSources,
    listReportSchedules,
    manageReportSchedule,
    listDefinitions,
    manageDefinition,
    listMembers
  ],
  triggers: []
});
