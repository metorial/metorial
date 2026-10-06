import { Slate } from 'slates';
import { spec } from './spec';
import { createBatchCheck, getBatchOperation, listOperations, verifyEmail } from './tools';

export let provider = Slate.create({
  spec,
  tools: [verifyEmail, createBatchCheck, getBatchOperation, listOperations],
  triggers: []
});
