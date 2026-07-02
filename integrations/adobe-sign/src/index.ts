import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAgreement,
  createLibraryTemplate,
  createWebForm,
  downloadAgreementDocument,
  downloadAuditTrail,
  getAgreement,
  getAgreementMembers,
  getBulkSend,
  getFormData,
  getLibraryTemplate,
  getSigningUrls,
  getUser,
  getWebForm,
  listAgreements,
  listBulkSends,
  listLibraryTemplates,
  listUsers,
  listWebForms,
  sendInBulk,
  sendReminder,
  updateAgreementState,
  updateBulkSendState,
  updateLibraryTemplateState,
  updateWebFormState,
  uploadDocument
} from './tools';
import { agreementEvents, megaSignEvents, webFormEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    uploadDocument,
    createAgreement,
    getAgreement,
    listAgreements,
    downloadAgreementDocument,
    getAgreementMembers,
    updateAgreementState,
    getSigningUrls,
    sendReminder,
    downloadAuditTrail,
    getFormData,
    createWebForm,
    getWebForm,
    listWebForms,
    updateWebFormState,
    createLibraryTemplate,
    getLibraryTemplate,
    listLibraryTemplates,
    updateLibraryTemplateState,
    sendInBulk,
    getBulkSend,
    listBulkSends,
    updateBulkSendState,
    getUser,
    listUsers
  ] as any,
  triggers: [agreementEvents, webFormEvents, megaSignEvents] as any
});
