import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let userEvents = SlateTrigger.create(spec, {
  name: 'User Events',
  key: 'user_events',
  description:
    'Triggers when a supporter/user is created or updated. Fired on sign-up, manual creation, or automatic creation from a donation.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of user event (created or updated)'),
      userUuid: z.string().describe('UUID of the user'),
      user: z.record(z.string(), z.any()).describe('Full user object from the webhook payload')
    })
  )
  .output(
    z.object({
      userUuid: z.string().describe('UUID of the user'),
      email: z.string().optional().describe('User email address'),
      firstName: z.string().optional().describe('User first name'),
      lastName: z.string().optional().describe('User last name'),
      phoneNumber: z.string().optional().describe('User phone number'),
      postcode: z.string().optional().describe('User postcode'),
      organisationUuid: z.string().optional().describe('UUID of the organisation'),
      createdAt: z.string().optional().describe('When the user was created')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new RaiselyClient({ token: ctx.auth.token });
      let result = await client.createWebhook({
        url: ctx.input.webhookBaseUrl,
        campaignUuid: ctx.config.campaignUuid
      });
      let webhook = result.data || result;
      return { registrationDetails: { webhookUuid: webhook.uuid } };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new RaiselyClient({ token: ctx.auth.token });
      await client.deleteWebhook(ctx.input.registrationDetails.webhookUuid);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, any>;
      let type = String(data.type || '');
      if (!type.startsWith('user.')) {
        return { inputs: [] };
      }
      let eventType = type.replace('user.', '');
      let user = (data.data || {}) as Record<string, any>;
      return {
        inputs: [
          {
            eventType,
            userUuid: String(user.uuid || data.uuid || ''),
            user
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let u = ctx.input.user as Record<string, any>;
      return {
        type: `user.${ctx.input.eventType}`,
        id: ctx.input.userUuid,
        output: {
          userUuid: String(u.uuid || ctx.input.userUuid),
          email: u.email as string | undefined,
          firstName: u.firstName as string | undefined,
          lastName: u.lastName as string | undefined,
          phoneNumber: u.phoneNumber as string | undefined,
          postcode: u.postcode as string | undefined,
          organisationUuid: u.organisationUuid as string | undefined,
          createdAt: u.createdAt as string | undefined
        }
      };
    }
  })
  .build();
