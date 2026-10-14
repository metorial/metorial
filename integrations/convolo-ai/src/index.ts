import { Slate } from 'slates';
import { spec } from './spec';
import {
  getDialerAgents,
  getDialerCallReports,
  getDialerCallsCount,
  getDialerStatistics,
  getSpeedToLeadReports,
  triggerCall
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    triggerCall,
    getSpeedToLeadReports,
    getDialerCallReports,
    getDialerStatistics,
    getDialerAgents,
    getDialerCallsCount
  ],
  triggers: []
});
