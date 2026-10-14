import { Slate } from 'slates';
import { spec } from './spec';
import {
  autocompleteCompany,
  domainLookup,
  findEmail,
  getCredits,
  getFinderResult,
  manageBulkFinder,
  manageBulkVerification,
  reverseLookup,
  startBulkFinder,
  startBulkVerification,
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
    getCredits,
    getFinderResult,
    startBulkFinder,
    startBulkVerification
  ],
  triggers: []
});
