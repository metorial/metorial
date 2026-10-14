import { Slate } from 'slates';
import { spec } from './spec';
import {
  enrichCompany,
  findEmail,
  findPhone,
  getContactLists,
  getCredits,
  getIntellimatchResults,
  getIntellimatchStatus,
  intellimatchSearch,
  listContacts,
  reverseEmailLookup,
  searchEmployees,
  verifyEmail
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    findEmail,
    verifyEmail,
    reverseEmailLookup,
    findPhone,
    enrichCompany,
    searchEmployees,
    intellimatchSearch,
    getIntellimatchStatus,
    getIntellimatchResults,
    getContactLists,
    listContacts,
    getCredits
  ],
  triggers: []
});
