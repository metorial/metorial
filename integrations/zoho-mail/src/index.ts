import { Slate } from 'slates';
import { spec } from './spec';
import {
  getAccountInfo,
  getEmail,
  listEmails,
  manageBookmarks,
  manageFolders,
  manageLabels,
  manageNotes,
  manageOrganization,
  manageTasks,
  searchEmails,
  sendEmail,
  updateEmail
} from './tools';
import { inboundWebhook, newEmail, newTask } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    sendEmail,
    listEmails,
    getEmail,
    searchEmails,
    updateEmail,
    manageFolders,
    manageLabels,
    manageTasks,
    manageNotes,
    manageBookmarks,
    getAccountInfo,
    manageOrganization
  ],
  triggers: [inboundWebhook, newEmail, newTask]
});
