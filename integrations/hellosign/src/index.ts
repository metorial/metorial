import { Slate } from 'slates';
import { spec } from './spec';
import {
  bulkSendTemplateRequest,
  createReport,
  downloadFiles,
  getAccount,
  getEmbeddedUrls,
  getSignatureRequest,
  getTemplate,
  listSignatureRequests,
  listTemplates,
  manageBulkSendJobs,
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
    bulkSendTemplateRequest,
    getSignatureRequest,
    listSignatureRequests,
    manageSignatureRequest,
    downloadFiles,
    manageBulkSendJobs,
    listTemplates,
    getTemplate,
    manageTemplate,
    getAccount,
    getEmbeddedUrls,
    manageTeam,
    createReport
  ],
  triggers: [signatureRequestEvents, templateEvents]
});
