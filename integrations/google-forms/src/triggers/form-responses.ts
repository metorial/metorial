import {
  googlePubSubDeliveryConfig,
  verifyGooglePubSubPushForProcessing
} from '@slates/google-pubsub';
import {
  createApiServiceError,
  parseWithServiceError,
  SlateTrigger,
  skipWebhook,
  triggerGroup
} from 'slates';
import { z } from 'zod';
import { GoogleFormsClient } from '../lib/client';
import { googleFormsActionScopes } from '../scopes';
import { spec } from '../spec';
import {
  formRegistrationSchema,
  formSelectionSchema,
  formSyncSchema,
  newResponseSchema
} from './event-schemas';
import { assertFormSelected, currentFormsOwner, formAutoRegistration } from './registration';
import { reconcileFormResponses } from './responses';

export const formResponses = triggerGroup(spec, {
  key: 'form_responses',
  name: 'Form responses',
  description: 'New submissions to the forms you select.',
  selectionSchema: formSelectionSchema,
  eventSchema: z.union([formSyncSchema, newResponseSchema])
})
  .webhook({
    deliveryConfig: googlePubSubDeliveryConfig('forms'),
    autoRegistration: formAutoRegistration,
    reconcileIntervalSeconds: 900,
    process: async ctx => {
      const parsed = formRegistrationSchema.safeParse(ctx.input.webhookRegistrationPayload);
      if (!parsed.success) return skipWebhook('invalid_registration', { status: 500 });
      const saved = parsed.data;
      const verified = await verifyGooglePubSubPushForProcessing(
        ctx.input.request,
        saved.delivery
      );
      if (!verified.ok) return verified.skipped;
      const attributes = verified.message.attributes;
      // The watch is shared and may be recreated under another ID, so it is not an identity.
      if (attributes.formId !== saved.formId)
        return skipWebhook('form_identity_mismatch', { status: 403 });
      if (attributes.eventType !== 'RESPONSES')
        return skipWebhook('unsupported_event_type', { status: 200 });
      return {
        events: [
          {
            matchers: [],
            payload: { kind: 'form_sync', formId: saved.formId },
            idempotencyKey: `${saved.formId}:${saved.delivery.subscriptionName}:${verified.message.messageId}`
          }
        ]
      };
    },
    expandWebhook: async ctx => {
      const saved = parseWithServiceError(
        formRegistrationSchema,
        ctx.input.webhookRegistrationPayload,
        'The saved form watch is invalid.'
      );
      if (ctx.input.payload !== null) {
        const payload = parseWithServiceError(
          formSyncSchema,
          ctx.input.payload,
          'The form notification is invalid.'
        );
        if (payload.formId !== saved.formId)
          throw createApiServiceError('The form notification identity does not match.');
      }
      assertFormSelected(saved.formId, ctx.input.selection);
      const client = new GoogleFormsClient(ctx.auth.token);
      if ((await currentFormsOwner(client)) !== saved.ownerId)
        throw createApiServiceError('The form watch belongs to a different Google account.');
      return reconcileFormResponses(client, saved, ctx.input.state);
    }
  })
  .routingMatchers(async () => [])
  .build();

export const newResponse = SlateTrigger.create(spec, {
  key: 'new_response',
  name: 'New response',
  description:
    'A response was first submitted after this form watch was enabled. Answers reflect the latest submission when retrieved; later edits do not emit another new response.'
})
  .triggerGroup(formResponses)
  .input(newResponseSchema)
  .output(newResponseSchema)
  .scopes(googleFormsActionScopes.newResponse)
  .matches(payload => newResponseSchema.safeParse(payload).success)
  .map(async ctx => ({
    type: 'form.response.submitted',
    id: ctx.input.eventId,
    output: ctx.input
  }))
  .build();
