import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteDocumentSubmission,
  getAmlScreening,
  getDocumentFraudResult,
  getKybReport,
  getVerification,
  listVerifications,
  manageVerification,
  requestBackgroundCheck,
  requestCreditCheck,
  requestIdentityVerification,
  requestKybReport,
  requestProofOfAddress,
  runAmlScreening,
  submitDocument
} from './tools';
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
    getKybReport,
    submitDocument,
    getDocumentFraudResult,
    deleteDocumentSubmission
  ],
  triggers: []
});
