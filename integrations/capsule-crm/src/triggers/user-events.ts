import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { CapsuleClient } from '../lib/client';
import { spec } from '../spec';

export let userEvents = SlateTrigger.create(spec, {
  name: 'User Events',
  key: 'user_events',
  description: 'Triggered when a user is created, updated, or deleted in Capsule CRM.'
})
  .input(
    z.object({
      eventType: z
        .enum(['user/created', 'user/updated', 'user/deleted'])
        .describe('Type of user event'),
      users: z.array(z.any()).describe('User records from the webhook payload')
    })
  )
  .output(
    z.object({
      userId: z.number().describe('ID of the affected user'),
      name: z.string().optional().describe('Full name'),
      username: z.string().optional().describe('Email/username'),
      role: z.string().optional().describe('User role'),
      status: z.string().optional().describe('Account status')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new CapsuleClient({ token: ctx.auth.token });

      let events = ['user/created', 'user/updated', 'user/deleted'];
      let hooks: Array<{ hookId: number; event: string }> = [];

      for (let event of events) {
        let hook = await client.createRestHook({
          event,
          targetUrl: ctx.input.webhookBaseUrl,
          description: `Slates: ${event}`
        });
        hooks.push({ hookId: hook.id, event });
      }

      return {
        registrationDetails: { hooks }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new CapsuleClient({ token: ctx.auth.token });
      let hooks = (ctx.input.registrationDetails as any)?.hooks || [];

      for (let hook of hooks) {
        try {
          await client.deleteRestHook(hook.hookId);
        } catch {
          // Hook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            eventType: data.event,
            users: data.payload || []
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let users = ctx.input.users || [];
      let eventAction = ctx.input.eventType.split('/')[1] || 'unknown';

      if (users.length === 0) {
        return {
          type: `user.${eventAction}`,
          id: `${ctx.input.eventType}-${Date.now()}`,
          output: {
            userId: 0
          }
        };
      }

      let u = users[0];

      return {
        type: `user.${eventAction}`,
        id: `${ctx.input.eventType}-${u.id}-${u.updatedAt || u.createdAt || Date.now()}`,
        output: {
          userId: u.id,
          name: u.name,
          username: u.username,
          role: u.role,
          status: u.status
        }
      };
    }
  })
  .build();
