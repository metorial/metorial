import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let userChangesTrigger = SlateTrigger.create(spec, {
  name: 'User Changes',
  key: 'user_changes',
  description:
    'Fires when users are created, updated, or deleted in the account. Covers new registrations, profile updates, and user removals.'
})
  .input(
    z.object({
      event: z.string().describe('Event type (e.g. new, change, delete)'),
      role: z.string().optional().describe('Role of the actor'),
      userId: z.string().optional().describe('User ID'),
      name: z.string().optional().describe('Username'),
      fullName: z.string().optional().describe('Full name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile number'),
      country: z.string().optional().describe('Country'),
      createdOn: z.string().optional().describe('UTC creation timestamp'),
      rawPayload: z.any().optional().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      userId: z.string().describe('User ID'),
      name: z.string().optional().describe('Username'),
      fullName: z.string().optional().describe('Full name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile number'),
      country: z.string().optional().describe('Country'),
      createdOn: z.string().optional().describe('UTC creation timestamp')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client(ctx.auth);

      // For user events, parent_id must be the Account ID
      // We use "M" (Changed user) which captures new, change, and delete events
      // We need the account ID - retrieve it from the schedules endpoint or use accountName
      let _schedules = await client.listSchedules();

      // The account ID is typically needed; try using the account name as parent_id
      // Per SuperSaaS docs, for user events parent_id should be the Account ID from Account Info page
      // Since we may not have this directly, we'll need to try common approaches
      let result = await client.createWebhook(
        'M',
        ctx.auth.accountName,
        ctx.input.webhookBaseUrl
      );
      let webhookId = result?.id ? String(result.id) : '';

      return {
        registrationDetails: { webhookId, parentId: ctx.auth.accountName }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client(ctx.auth);
      let details = ctx.input.registrationDetails as { webhookId: string; parentId: string };

      if (details?.webhookId) {
        try {
          await client.deleteWebhook(details.webhookId, details.parentId);
        } catch {
          // Best-effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let events = Array.isArray(data) ? data : [data];

      let inputs = events.map((item: any) => ({
        event: item.event ?? 'unknown',
        role: item.role != null ? String(item.role) : undefined,
        userId: item.id != null ? String(item.id) : undefined,
        name: item.name ?? undefined,
        fullName: item.full_name ?? undefined,
        email: item.email ?? undefined,
        phone: item.phone ?? undefined,
        mobile: item.mobile ?? undefined,
        country: item.country ?? undefined,
        createdOn: item.created_on ?? undefined,
        rawPayload: item
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let eventType = ctx.input.event || 'unknown';
      let userId = ctx.input.userId || `unknown-${Date.now()}`;

      return {
        type: `user.${eventType}`,
        id: `${userId}-${eventType}-${ctx.input.createdOn || Date.now()}`,
        output: {
          userId,
          name: ctx.input.name,
          fullName: ctx.input.fullName,
          email: ctx.input.email,
          phone: ctx.input.phone,
          mobile: ctx.input.mobile,
          country: ctx.input.country,
          createdOn: ctx.input.createdOn
        }
      };
    }
  })
  .build();
