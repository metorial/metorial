import { Slate } from 'slates';
import { spec } from './spec';
import { paymentTrigger } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [],
  triggers: [paymentTrigger]
});
