import { Slate } from 'slates';
import { spec } from './spec';
import {
  checkBatchTask,
  checkUsage,
  classifyDocument,
  deleteBatchTask,
  extractSignatures,
  processAnyDocument,
  processFinanceDocument,
  splitDocument,
  submitBatch,
  submitFeedback
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    classifyDocument,
    deleteBatchTask,
    processFinanceDocument,
    processAnyDocument,
    extractSignatures,
    splitDocument,
    submitBatch,
    checkBatchTask,
    submitFeedback,
    checkUsage
  ],
  triggers: []
});
