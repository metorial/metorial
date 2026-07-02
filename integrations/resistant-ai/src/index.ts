import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAmlScreening,
  getKybReport,
  getVerification,
  listVerifications,
  manageVerification,
  requestBackgroundCheck,
  requestCreditCheck,
  requestIdentityVerification,
  requestKybReport,
  requestProofOfAddress,
  runAmlScreening
} from './tools';
import { verificationCompleted } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    requestIdentityVerification,
    getVerification,
    listVerifications,
    manageVerification,
    runAmlScreening,
    getAmlScreening,
    requestProofOfAddress,
    requestBackgroundCheck,
    requestCreditCheck,
    requestKybReport,
    getKybReport
  ],
  triggers: [verificationCompleted]
});
