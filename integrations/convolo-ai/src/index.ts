import { Slate } from 'slates';
import { spec } from './spec';
import {
  getDialerCallReports,
  getDialerStatistics,
  getSpeedToLeadReports,
  triggerCall
} from './tools';
import { dialerCallEvents, speedToLeadCallEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [triggerCall, getSpeedToLeadReports, getDialerCallReports, getDialerStatistics],
  triggers: [speedToLeadCallEvents, dialerCallEvents]
});
