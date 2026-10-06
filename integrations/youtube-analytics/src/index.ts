import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadBulkReport,
  listBulkReports,
  listReportTypes,
  manageGroupItems,
  manageGroups,
  manageReportingJobs,
  queryAnalytics
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    queryAnalytics,
    manageGroups,
    manageGroupItems,
    manageReportingJobs,
    listBulkReports,
    listReportTypes,
    downloadBulkReport
  ],
  triggers: []
});
