import { Slate } from 'slates';
import { spec } from './spec';
import {
  createAgreement,
  createLibraryTemplate,
  createWebForm,
  downloadAuditTrail,
  getAgreement,
  getFormData,
  getSigningUrls,
  listAgreements,
  listLibraryTemplates,
  listUsers,
  listWebForms,
  sendInBulk,
  sendReminder,
  updateAgreementState,
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
    updateAgreementState,
    getSigningUrls,
    sendReminder,
    downloadAuditTrail,
    getFormData,
    createWebForm,
    listWebForms,
    createLibraryTemplate,
    listLibraryTemplates,
    sendInBulk,
    listUsers
  ] as any,
  triggers: [agreementEvents, webFormEvents, megaSignEvents] as any
});
