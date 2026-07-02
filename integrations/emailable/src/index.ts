import { Slate } from 'slates';
import { spec } from './spec';
import { getAccount, getBatchStatus, verifyBatch, verifyEmail } from './tools';
import { batchCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [verifyEmail, verifyBatch, getBatchStatus, getAccount],
  triggers: [batchCompleted]
});
