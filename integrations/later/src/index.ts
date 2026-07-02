import { Slate } from 'slates';
import { spec } from './spec';
import {
  getInstanceTool,
  getPerformanceReportTool,
  listCampaignsTool,
  listReportingGroupsTool
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

export let provider = Slate.create({
  spec,
  tools: [
    getInstanceTool,
    listCampaignsTool,
    listReportingGroupsTool,
    getPerformanceReportTool
  ],
  triggers: [inboundWebhook]
});
