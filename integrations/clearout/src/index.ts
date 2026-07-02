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
import { clearoutEvents } from './triggers';

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
  triggers: [clearoutEvents]
});
