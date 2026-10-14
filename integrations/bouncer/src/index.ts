import { Slate } from 'slates';
import { spec } from './spec';
import {
  batchVerifyEmails,
  checkCredits,
  checkToxicity,
  createBatchVerification,
  deleteBatchVerification,
  deleteToxicityJob,
  finishBatchVerification,
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
    finishBatchVerification,
    deleteBatchVerification,
    verifyDomain,
    checkToxicity,
    getToxicityStatus,
    getToxicityResults,
    deleteToxicityJob,
    checkCredits
  ],
  triggers: []
});
