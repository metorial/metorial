import { Slate } from 'slates';
import { spec } from './spec';
import {
  createBatchVerification,
  getBatchVerificationStatus,
  getCreditBalance,
  verifyEmail
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [verifyEmail, createBatchVerification, getBatchVerificationStatus, getCreditBalance],
  triggers: []
});
