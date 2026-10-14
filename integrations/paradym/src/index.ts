import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCredentialTemplate,
  createVerificationRequest,
  getCredentialTemplate,
  getIssuanceSession,
  getPresentationTemplate,
  getVerificationSession,
  issueCredential,
  listCredentialTemplates,
  listDidcommConnections,
  listDids,
  listIssuedCredentials,
  listPresentationTemplates,
  listProjects,
  listTrustedEntities,
  manageDidcommConnection,
  managePresentationTemplate,
  manageTrustedEntity,
  revokeCredentials
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listCredentialTemplates,
    getCredentialTemplate,
    createCredentialTemplate,
    issueCredential,
    getIssuanceSession,
    createVerificationRequest,
    getVerificationSession,
    revokeCredentials,
    managePresentationTemplate,
    listPresentationTemplates,
    getPresentationTemplate,
    manageDidcommConnection,
    listDidcommConnections,
    manageTrustedEntity,
    listTrustedEntities,
    listProjects,
    listIssuedCredentials,
    listDids
  ],
  triggers: []
});
