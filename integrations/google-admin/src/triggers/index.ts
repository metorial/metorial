import { verifyChannelNotification } from '@slates/google-push-channels';
import {
  createApiServiceError,
  parseWithServiceError,
  SlateTrigger,
  skipWebhook,
  triggerGroup
} from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';
import {
  activitySchema,
  lifecycleEventSchema,
  lifecycleNameSchema,
  registrationSchema,
  selectionSchema,
  wakeupSchema
} from './event-schemas';
import { reconcileAdminActivities } from './reconcile';
import { adminAutoRegistration, assertAdminIdentity } from './registration';

export const adminLifecycle = triggerGroup(spec, {
  key: 'user_lifecycle',
  name: 'User lifecycle',
  description:
    'Administrator-audited user creation, suspension, and deletion in the selected Workspace customer.',
  selectionSchema,
  eventSchema: z.union([wakeupSchema, lifecycleEventSchema])
})
  .webhook({
    autoRegistration: adminAutoRegistration,
    reconcileIntervalSeconds: 900,
    process: async ctx => {
      const registration = registrationSchema.safeParse(ctx.input.webhookRegistrationPayload);
      if (!registration.success)
        return skipWebhook('google_admin_webhook_registration_invalid', { status: 500 });
      const request = ctx.input.request;
      const saved = registration.data;
      const verified = await verifyChannelNotification({
        integration: 'google_admin',
        request,
        channels: [saved.channel, ...saved.previousChannels]
      });
      if (!verified.ok) return verified.skip;
      const { channel, messageNumber: message, resourceState } = verified;
      if (!resourceState)
        return skipWebhook('google_admin_webhook_state_missing', { status: 400 });
      const body = await request.arrayBuffer();
      if (resourceState === 'sync') {
        if (body.byteLength)
          return skipWebhook('google_admin_webhook_sync_body_invalid', { status: 400 });
        return { events: [] };
      }
      if (!lifecycleNameSchema.safeParse(resourceState).success) return { events: [] };
      let json: unknown;
      try {
        json = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body));
      } catch {
        return skipWebhook('google_admin_webhook_body_invalid', { status: 400 });
      }
      const activity = activitySchema.safeParse(json);
      if (!activity.success)
        return skipWebhook('google_admin_webhook_activity_invalid', { status: 400 });
      if (activity.data.id.customerId !== saved.customerId)
        return skipWebhook('google_admin_webhook_customer_mismatch', { status: 403 });
      if (
        !activity.data.events.some(
          event => event.name === resourceState && event.type === 'USER_SETTINGS'
        )
      )
        return skipWebhook('google_admin_webhook_event_mismatch', { status: 400 });
      // Google echoes a channel secret but provides no payload signature or signed
      // timestamp. Treat the body only as a wakeup; authenticated audit reads emit events.
      return {
        events: [
          {
            payload: { kind: 'admin_audit_sync', customerId: saved.customerId },
            matchers: [],
            idempotencyKey: `${channel.id}:${message}`
          }
        ]
      };
    },
    expandWebhook: async ctx => {
      const saved = parseWithServiceError(
        registrationSchema,
        ctx.input.webhookRegistrationPayload,
        'The saved administrator activity channel is invalid.'
      );
      const selection = parseWithServiceError(
        selectionSchema,
        ctx.input.selection,
        'Select a Workspace customer for administrator lifecycle events.'
      );
      if (selection.customerId !== saved.customerId)
        throw createApiServiceError(
          'The selected Workspace customer does not match the saved subscription.'
        );
      if (ctx.input.payload !== null) {
        const wakeup = parseWithServiceError(
          wakeupSchema,
          ctx.input.payload,
          'The administrator activity notification is invalid.'
        );
        if (wakeup.customerId !== saved.customerId)
          throw createApiServiceError(
            'The administrator activity notification belongs to a different customer.'
          );
      }
      const client = new Client({ token: ctx.auth.token });
      await assertAdminIdentity(client, saved);
      return reconcileAdminActivities(client, saved, ctx.input.state, message =>
        ctx.warn(message)
      );
    }
  })
  // Automatic target subscriptions own routing; channel and customer checks isolate delivery.
  .routingMatchers(async () => [])
  .build();

function lifecycleTrigger(
  key: string,
  name: string,
  eventName: 'CREATE_USER' | 'SUSPEND_USER' | 'DELETE_USER',
  type: string
) {
  return SlateTrigger.create(spec, {
    key,
    name,
    description: `An administrator ${eventName === 'CREATE_USER' ? 'created' : eventName === 'SUSPEND_USER' ? 'suspended' : 'deleted'} a Workspace user, as recorded in the admin audit log.`
  })
    .triggerGroup(adminLifecycle)
    .input(lifecycleEventSchema)
    .output(lifecycleEventSchema)
    .scopes(googleAdminActionScopes.userLifecycle)
    .matches(payload => {
      const parsed = lifecycleEventSchema.safeParse(payload);
      return parsed.success && parsed.data.eventName === eventName;
    })
    .map(async ctx => ({ type, id: ctx.input.eventId, output: ctx.input }))
    .build();
}
export const userCreated = lifecycleTrigger(
  'user_created',
  'User created',
  'CREATE_USER',
  'admin.user.created'
);
export const userSuspended = lifecycleTrigger(
  'user_suspended',
  'User suspended',
  'SUSPEND_USER',
  'admin.user.suspended'
);
export const userDeleted = lifecycleTrigger(
  'user_deleted',
  'User deleted',
  'DELETE_USER',
  'admin.user.deleted'
);
