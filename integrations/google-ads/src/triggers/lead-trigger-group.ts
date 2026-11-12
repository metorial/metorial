import { triggerGroup } from 'slates';
import { spec } from '../spec';
import { leadEventSchema } from './event-schemas';
import { listLeadTargets, registerLeadWebhook, unregisterLeadWebhook } from './registration';
import { processLeadWebhook } from './webhook';

export const leadForms = triggerGroup(spec, {
  key: 'lead_forms',
  name: 'Lead Forms',
  description:
    'Receive submitted leads from Google Ads lead forms with an available webhook destination.',
  eventSchema: leadEventSchema
})
  .webhook({
    autoRegistration: {
      webhookTargetList: ctx =>
        listLeadTargets(ctx.auth, ctx.config, ctx.input.pageToken, ctx),
      webhookRegister: ctx => registerLeadWebhook(ctx.auth, ctx.config, ctx.input),
      webhookUnregister: ctx =>
        unregisterLeadWebhook(ctx.auth, ctx.config, ctx.input.webhookRegistrationPayload)
    },
    process: ctx => processLeadWebhook(ctx.input, ctx)
  })
  // Automatic targets route through subscriptions, not connection matchers.
  .routingMatchers(async () => [])
  .build();
