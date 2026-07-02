import { Slate } from 'slates';
import { spec } from './spec';
import {
  calculateSignerId,
  checkDocument,
  configureForm,
  createBriefcase,
  createEditorExpress,
  createSignExpress,
  getAccountInfo,
  getAuditTrail,
  getBriefcase,
  getDocumentMetadata,
  getEditorExpress,
  getFormDescriptor,
  getLinkedDocuments,
  getSignExpress,
  listActiveDocuments,
  listContacts,
  removeBriefcase,
  removeContact,
  removeDocument,
  removeEditorExpress,
  removeSignExpress,
  sendNotification,
  updateTokenConfig,
  uploadDocument,
  upsertContacts
} from './tools';
import { documentSigned, inboundWebhook, notificationError } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    uploadDocument,
    configureForm,
    sendNotification,
    getDocumentMetadata,
    checkDocument,
    removeDocument,
    getFormDescriptor,
    getLinkedDocuments,
    listContacts,
    upsertContacts,
    removeContact,
    createBriefcase,
    getBriefcase,
    removeBriefcase,
    createSignExpress,
    getSignExpress,
    removeSignExpress,
    createEditorExpress,
    getEditorExpress,
    removeEditorExpress,
    getAccountInfo,
    listActiveDocuments,
    calculateSignerId,
    updateTokenConfig,
    getAuditTrail
  ],
  triggers: [inboundWebhook, documentSigned, notificationError]
});
