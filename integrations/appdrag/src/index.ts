import { Slate } from 'slates';
import { spec } from './spec';
import {
  executeApiFunction,
  executeSqlQuery,
  getFailedEmails,
  manageDirectories,
  manageFiles,
  manageNewsletterContacts,
  sendEmail
} from './tools';
import { inboundWebhook, newFormSubmission, newOrder, orderStatusUpdated } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    executeSqlQuery,
    executeApiFunction,
    manageFiles,
    manageDirectories,
    sendEmail,
    manageNewsletterContacts,
    getFailedEmails
  ],
  triggers: [inboundWebhook, newFormSubmission, newOrder, orderStatusUpdated]
});
