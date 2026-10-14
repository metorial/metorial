import { Slate } from 'slates';
import { spec } from './spec';
import {
  createPresentation,
  createProofRequest,
  deleteCredential,
  getCredentials,
  getCurrentUser,
  getJobStatus,
  getMessages,
  getProofRequests,
  getTemplates,
  issueCredential,
  manageAnchor,
  manageDid,
  manageProfile,
  manageRegistry,
  manageSchema,
  sendMessage,
  verifyCredential
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    getTemplates,
    getMessages,
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
  triggers: []
});
