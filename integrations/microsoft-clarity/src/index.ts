import { Slate } from 'slates';
import { spec } from './spec';
import { getDashboardInsights, listSessionRecordings } from './tools';
import { dashboardMetricsUpdated, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [getDashboardInsights, listSessionRecordings],
  triggers: [inboundWebhook, dashboardMetricsUpdated]
});
