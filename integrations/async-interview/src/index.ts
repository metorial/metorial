import { Slate } from 'slates';
import { spec } from './spec';
import { listInterviewResponses, listJobs } from './tools';
import { inboundWebhook, newInterviewResponse } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [listJobs, listInterviewResponses],
  triggers: [inboundWebhook, newInterviewResponse]
});
