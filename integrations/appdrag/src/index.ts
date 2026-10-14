import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteNewsletterList,
  executeApiFunction,
  executeSqlQuery,
  getFailedEmails,
  manageDirectories,
  manageFiles,
  manageNewsletterContacts,
  sendEmail
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    executeSqlQuery,
    executeApiFunction,
    manageFiles,
    manageDirectories,
    sendEmail,
    manageNewsletterContacts,
    getFailedEmails,
    deleteNewsletterList
  ],
  triggers: []
});
