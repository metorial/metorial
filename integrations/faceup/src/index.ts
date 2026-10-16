import { Slate } from 'slates';
import { spec } from './spec';
import { getReport, getReportStatistics, listReports, syncEmployees } from './tools';
export let provider = Slate.create({
  spec,
  tools: [getReportStatistics, listReports, getReport, syncEmployees],
  triggers: []
});
