import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCompany,
  createContact,
  getMetadata,
  listCompanies,
  listContacts,
  subscribeMarketingAudience,
  updateCompany,
  updateContact
} from './tools';
import {
  automationWebhook,
  billingWebhook,
  newCompany,
  newContact,
  projectWebhook
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    createContact,
    updateContact,
    listContacts,
    createCompany,
    updateCompany,
    listCompanies,
    getMetadata,
    subscribeMarketingAudience
  ],
  triggers: [newContact, newCompany, billingWebhook, projectWebhook, automationWebhook]
});
