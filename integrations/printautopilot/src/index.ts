import { Slate } from 'slates';
import { spec } from './spec';
import { createPrinters, finishDocuments, listPrintJobs, submitDocument } from './tools';

export let provider = Slate.create({
  spec,
  tools: [submitDocument, listPrintJobs, createPrinters, finishDocuments],
  triggers: []
});
