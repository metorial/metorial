import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchVerifyEmails,
  checkCredits,
  checkToxicity,
  createBatchVerification,
  getBatchResults,
  getBatchStatus,
  getToxicityResults,
  getToxicityStatus,
  verifyDomain,
  verifyEmail
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    verifyEmail,
    batchVerifyEmails,
    createBatchVerification,
    getBatchStatus,
    getBatchResults,
    verifyDomain,
    checkToxicity,
    getToxicityStatus,
    getToxicityResults,
    checkCredits
  ],
  triggers: []
});
