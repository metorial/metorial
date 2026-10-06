import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAnalyticsTool,
  getInstanceTool,
  getPerformanceReportTool,
  listCampaignsTool,
  listCampaignsV2Tool,
  listInstancesTool,
  listReportingGroupsTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getInstanceTool,
    listCampaignsTool,
    listReportingGroupsTool,
    getPerformanceReportTool,
    listInstancesTool,
    listCampaignsV2Tool,
    getAnalyticsTool
  ],
  triggers: []
});
