import { Slate } from 'slates';
import { spec } from './spec';
import {
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
import {
  dataSourceEvents,
  definitionEvents,
  memberEvents,
  reportEvents,
  reportRunEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [reportEvents, reportRunEvents, dataSourceEvents, definitionEvents, memberEvents]
});
