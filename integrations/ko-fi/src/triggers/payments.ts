import { SlateTrigger } from 'slates';
import { spec } from '../spec';
import { matchesPayment, paymentEventSchema } from './event-schemas';
import { paymentEvents } from './payment-trigger-group';

export let paymentReceived = SlateTrigger.create(spec, {
  key: 'payment_received',
  name: 'Payment Received',
  description:
    'Triggers for a completed Ko-fi payment, preserving its type, supporter details, amount, and original payment fields. This companion to Donation Received also includes other payment types.'
})
  .triggerGroup(paymentEvents)
  .input(paymentEventSchema)
  .output(paymentEventSchema)
  .matches(matchesPayment)
  .map(async ctx => {
    let { verification_token: _token, ...output } = ctx.input;
    return { type: 'payment.received', id: ctx.input.message_id, output };
  })
  .build();

export let donationReceived = SlateTrigger.create(spec, {
  key: 'donation_received',
  name: 'Donation Received',
  description:
    'Triggers for a Ko-fi payment whose type is Donation. For every payment type, use Payment Received.'
})
  .triggerGroup(paymentEvents)
  .input(paymentEventSchema)
  .output(paymentEventSchema)
  .matches(payload => matchesPayment(payload) && payload.type === 'Donation')
  .map(async ctx => {
    let { verification_token: _token, ...output } = ctx.input;
    return { type: 'donation.received', id: ctx.input.message_id, output };
  })
  .build();
