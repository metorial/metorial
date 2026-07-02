import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCredentialTemplate,
  createVerificationRequest,
  getIssuanceSession,
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
import { credentialEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCredentialTemplates,
    createCredentialTemplate,
    issueCredential,
    getIssuanceSession,
    createVerificationRequest,
    getVerificationSession,
    revokeCredentials,
    managePresentationTemplate,
    listPresentationTemplates,
    manageDidcommConnection,
    listDidcommConnections,
    manageTrustedEntity,
    listTrustedEntities,
    listProjects,
    listIssuedCredentials,
    listDids
  ],
  triggers: [credentialEvent]
});
