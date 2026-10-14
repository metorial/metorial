import { Slate } from 'slates';
import { spec } from './spec';
import {
  autocompleteAddress,
  autocompleteInternationalAddress,
  batchVerifyAddresses,
  batchVerifyInternationalAddresses,
  completeAddressSuggestion,
  completeInternationalAddressSuggestion,
  getLookupInfo,
  lookupCityState,
  parseAddress,
  verifyAddress,
  verifyInternationalAddress
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    verifyAddress,
    batchVerifyAddresses,
    autocompleteAddress,
    completeAddressSuggestion,
    verifyInternationalAddress,
    batchVerifyInternationalAddresses,
    autocompleteInternationalAddress,
    completeInternationalAddressSuggestion,
    getLookupInfo,
    parseAddress,
    lookupCityState
  ],
  triggers: []
});
