import { Slate } from 'slates';
import { spec } from './spec';
import { donationReceived, paymentEvents, paymentReceived } from './triggers';
export let provider = Slate.create({
  spec,
  tools: [],
  triggerGroups: [paymentEvents],
  triggers: [donationReceived, paymentReceived]
});
