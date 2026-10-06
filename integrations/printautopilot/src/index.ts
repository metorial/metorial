import { Slate } from 'slates';
import { spec } from './spec';
import { listPrintJobs, submitDocument } from './tools';

export let provider = Slate.create({
  spec,
  tools: [submitDocument, listPrintJobs],
  triggers: []
});
