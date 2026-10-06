import { Slate } from 'slates';
import { spec } from './spec';
import {
  getDialerCallReports,
  getDialerStatistics,
  getSpeedToLeadReports,
  triggerCall
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [triggerCall, getSpeedToLeadReports, getDialerCallReports, getDialerStatistics],
  triggers: []
});
