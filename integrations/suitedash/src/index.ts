import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCompany,
  createContact,
  getCompany,
  getCompanyMetadata,
  getContact,
  getMetadata,
  listCompanies,
  listContacts,
  subscribeMarketingAudience,
  updateCompany,
  updateContact
} from './tools';
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
    subscribeMarketingAudience,
    getContact,
    getCompany,
    getCompanyMetadata
  ],
  triggers: []
});
