import { Slate } from 'slates';
import { spec } from './spec';
import { listInterviewResponses, listJobs } from './tools';
export let provider = Slate.create({
  spec,
  tools: [listJobs, listInterviewResponses],
  triggers: []
});
