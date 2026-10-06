import { Slate } from 'slates';
import { spec } from './spec';
import { getDashboardInsights, listSessionRecordings } from './tools';
export let provider = Slate.create({
  spec,
  tools: [getDashboardInsights, listSessionRecordings],
  triggers: []
});
