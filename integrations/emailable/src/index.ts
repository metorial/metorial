import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccount,
  getBatchResults,
  getBatchStatus,
  getFileUrl,
  verifyBatch,
  verifyEmail
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [verifyEmail, verifyBatch, getBatchStatus, getBatchResults, getAccount, getFileUrl],
  triggers: []
});
