import { Slate } from 'slates';
import { spec } from './spec';
import { provideValidationFeedback, validateAddress } from './tools';

export let provider = Slate.create({
  spec,
  tools: [validateAddress, provideValidationFeedback],
  triggers: []
});
