import { Slate } from 'slates';
import { spec } from './spec';
import {
  approveDenySigningRequest,
  downloadSignedArtifact,
  getAuditLog,
  getCertificate,
  getCurrentUser,
  getProject,
  getSigningPolicies,
  getSigningRequest,
  getSigningRequestStatus,
  listCertificates,
  listProjects,
  resubmitSigningRequest,
  submitSigningRequest
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCurrentUser,
    getSigningRequestStatus,
    downloadSignedArtifact,
    submitSigningRequest,
    getSigningRequest,
    resubmitSigningRequest,
    approveDenySigningRequest,
    listProjects,
    getProject,
    listCertificates,
    getCertificate,
    getSigningPolicies,
    getAuditLog
  ],
  triggers: []
});
