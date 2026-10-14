import { Slate } from 'slates';
import { spec } from './spec';
import { getDashboardInsights, listSessionRecordings, queryAnalyticsDashboard } from './tools';
export let provider = Slate.create({
  spec,
  tools: [getDashboardInsights, listSessionRecordings, queryAnalyticsDashboard],
  triggers: []
});
