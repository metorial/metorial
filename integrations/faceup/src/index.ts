import { Slate } from 'slates';
import { spec } from './spec';
import { getReport, getReportStatistics, listReports } from './tools';
import { newInternalComment, newMessage, newReport } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [getReportStatistics, listReports, getReport],
  triggers: [newReport, newMessage, newInternalComment]
});
