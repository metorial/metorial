import { Slate } from 'slates';
import { spec } from './spec';
import {
  addRecipient,
  createContact,
  createDocument,
  createDocumentFolder,
  createDocumentLink,
  deleteContact,
  deleteDocument,
  downloadDocument,
  getDocument,
  getTemplate,
  linkCrmObject,
  listContacts,
  listContentLibrary,
  listDocumentFolders,
  listDocuments,
  listForms,
  listMembers,
  listTemplates,
  manageDocumentStatus,
  moveDocumentToFolder,
  removeRecipient,
  sendDocument,
  sendReminder,
  updateContact,
  updateRecipient
} from './tools';
import { documentEvents, templateEvents } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createDocument,
    listDocuments,
    getDocument,
    sendDocument,
    manageDocumentStatus,
    deleteDocument,
    createDocumentLink,
    downloadDocument,
    listTemplates,
    getTemplate,
    createContact,
    listContacts,
    updateContact,
    deleteContact,
    addRecipient,
    updateRecipient,
    removeRecipient,
    linkCrmObject,
    sendReminder,
    listMembers,
    listForms,
    listContentLibrary,
    listDocumentFolders,
    createDocumentFolder,
    moveDocumentToFolder
  ],
  triggers: [documentEvents, templateEvents]
});
