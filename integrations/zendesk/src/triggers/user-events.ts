import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { ZendeskClient } from '../lib/client';
import { spec } from '../spec';

export let userEvents = SlateTrigger.create(spec, {
  name: 'User Events',
  key: 'user_events',
  description:
    'Triggers when user activity occurs, including user creation, deletion, role changes, and profile modifications.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of user event'),
      eventId: z.string().describe('Unique event identifier'),
      userId: z.string().describe('The user ID'),
      name: z.string().nullable().describe('The user name'),
      email: z.string().nullable().describe('The user email'),
      role: z.string().nullable().describe('The user role'),
      suspended: z.boolean().nullable().describe('Whether the user is suspended'),
      updatedAt: z.string().nullable().describe('When the user was last updated')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('The user ID'),
      name: z.string().nullable().describe('The user name'),
      email: z.string().nullable().describe('The user email'),
      role: z.string().nullable().describe('The user role'),
      suspended: z.boolean().nullable().describe('Whether the user is suspended'),
      updatedAt: z.string().nullable().describe('When the user was last updated')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new ZendeskClient({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token,
        tokenType: ctx.auth.tokenType
      });

      let webhook = await client.createWebhook({
        name: 'Slates User Events',
        status: 'active',
        endpoint: ctx.input.webhookBaseUrl,
        http_method: 'POST',
        request_format: 'json',
        subscriptions: [
          'zen:event-type:user.created',
          'zen:event-type:user.deleted',
          'zen:event-type:user.RoleChanged',
          'zen:event-type:user.ActiveChanged',
          'zen:event-type:user.SuspendedChanged',
          'zen:event-type:user.NameChanged',
          'zen:event-type:user.IdentityChanged',
          'zen:event-type:user.CustomFieldChanged',
          'zen:event-type:user.TagsChanged',
          'zen:event-type:user.OrganizationMembershipCreated',
          'zen:event-type:user.OrganizationMembershipDeleted'
        ]
      });

      return {
        registrationDetails: {
          webhookId: webhook.id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new ZendeskClient({
        subdomain: ctx.config.subdomain,
        token: ctx.auth.token,
        tokenType: ctx.auth.tokenType
      });

      await client.deleteWebhook(ctx.input.registrationDetails.webhookId);
    },

    handleRequest: async ctx => {
      let data: any = await ctx.request.json();

      let eventType = 'user.updated';
      if (data.type) {
        let typeParts = String(data.type).split(':');
        eventType = typeParts[typeParts.length - 1] || 'user.updated';
      }
      if (data.event?.type) {
        eventType = data.event.type;
      }

      let user = data.detail?.user || data.user || data;
      let userId = String(user.id || data.id || 'unknown');

      return {
        inputs: [
          {
            eventType,
            eventId: `${userId}-${data.id || Date.now()}`,
            userId,
            name: user.name || null,
            email: user.email || null,
            role: user.role || null,
            suspended: user.suspended ?? null,
            updatedAt: user.updated_at || null
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.eventType.toLowerCase().replace(/\s+/g, '_');
      if (!eventType.startsWith('user.')) {
        eventType = `user.${eventType}`;
      }

      return {
        type: eventType,
        id: ctx.input.eventId,
        output: {
          userId: ctx.input.userId,
          name: ctx.input.name,
          email: ctx.input.email,
          role: ctx.input.role,
          suspended: ctx.input.suspended,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
