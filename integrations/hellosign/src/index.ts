import { Slate } from 'slates';
import { spec } from './spec';
import {
  downloadFiles,
  getAccount,
  getEmbeddedUrls,
  getSignatureRequest,
  getTemplate,
  listSignatureRequests,
  listTemplates,
  manageSignatureRequest,
  manageTeam,
  manageTemplate,
  sendSignatureRequest,
  sendTemplateRequest
} from './tools';
import { signatureRequestEvents, templateEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendSignatureRequest,
    sendTemplateRequest,
    getSignatureRequest,
    listSignatureRequests,
    manageSignatureRequest,
    downloadFiles,
    listTemplates,
    getTemplate,
    manageTemplate,
    getAccount,
    getEmbeddedUrls,
    manageTeam
  ],
  triggers: [signatureRequestEvents, templateEvents]
});
