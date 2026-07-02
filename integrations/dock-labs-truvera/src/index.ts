import { Slate } from 'slates';
import { spec } from './spec';
import {
  createPresentation,
  createProofRequest,
  deleteCredential,
  getCredentials,
  getJobStatus,
  getProofRequests,
  issueCredential,
  manageAnchor,
  manageDid,
  manageProfile,
  manageRegistry,
  manageSchema,
  sendMessage,
  verifyCredential
} from './tools';
import {
  credentialEvents,
  didEvents,
  proofEvents,
  registryEvents,
  schemaEvents
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    manageDid,
    issueCredential,
    getCredentials,
    deleteCredential,
    verifyCredential,
    manageSchema,
    manageRegistry,
    manageAnchor,
    createProofRequest,
    getProofRequests,
    createPresentation,
    manageProfile,
    sendMessage,
    getJobStatus
  ],
  triggers: [credentialEvents, didEvents, registryEvents, schemaEvents, proofEvents]
});
