import { Slate } from 'slates';
import { spec } from './spec';
import {
  autocompleteCompany,
  domainLookup,
  findEmail,
  getCredits,
  manageBulkFinder,
  manageBulkVerification,
  reverseLookup,
  verifyEmail
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    verifyEmail,
    findEmail,
    manageBulkVerification,
    manageBulkFinder,
    reverseLookup,
    domainLookup,
    autocompleteCompany,
    getCredits
  ],
  triggers: []
});
