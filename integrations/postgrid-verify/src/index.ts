import { Slate } from 'slates';
import { spec } from './spec';
import {
  autocompleteAddress,
  autocompleteInternationalAddress,
  batchVerifyAddresses,
  batchVerifyInternationalAddresses,
  completeAddressSuggestion,
  completeInternationalAddressSuggestion,
  verifyAddress,
  verifyInternationalAddress
} from './tools';

import { inboundWebhook } from './triggers/inbound-webhook';

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
    completeInternationalAddressSuggestion
  ],
  triggers: [inboundWebhook]
});
