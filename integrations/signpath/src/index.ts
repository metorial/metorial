import { Slate } from 'slates';
import { spec } from './spec';
import {
  approveDenySigningRequest,
  getAuditLog,
  getCertificate,
  getProject,
  getSigningPolicies,
  getSigningRequest,
  listCertificates,
  listProjects,
  resubmitSigningRequest,
  submitSigningRequest
} from './tools';
import { signingRequestStatusChange } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
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
  triggers: [signingRequestStatusChange]
});
