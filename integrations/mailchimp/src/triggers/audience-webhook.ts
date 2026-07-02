import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { MailchimpClient } from '../lib/client';
import { spec } from '../spec';

export let audienceWebhookTrigger = SlateTrigger.create(spec, {
  name: 'Audience Changes',
  key: 'audience_webhook',
  description:
    'Triggers on audience (list) changes including subscribe, unsubscribe, profile update, cleaned email, email address change, and campaign sending events.'
})
  .input(
    z.object({
      eventType: z
        .enum(['subscribe', 'unsubscribe', 'profile', 'cleaned', 'upemail', 'campaign'])
        .describe('Type of audience event'),
      firedAt: z.string().describe('Timestamp when the event occurred'),
      listId: z.string().describe('Audience ID'),
      emailAddress: z.string().optional().describe('Email address of the affected member'),
      mergeFields: z.record(z.string(), z.any()).optional().describe('Merge field values'),
      oldEmail: z.string().optional().describe('Previous email address (for upemail events)'),
      newEmail: z.string().optional().describe('New email address (for upemail events)'),
      campaignSubject: z
        .string()
        .optional()
        .describe('Campaign subject line (for campaign events)'),
      campaignStatus: z.string().optional().describe('Campaign status (for campaign events)'),
      campaignSendTime: z
        .string()
        .optional()
        .describe('Campaign send time (for campaign events)'),
      rawPayload: z.record(z.string(), z.any()).describe('Full raw payload from webhook')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Audience ID'),
      emailAddress: z.string().optional().describe('Email address of the affected member'),
      subscriberHash: z.string().optional().describe('MD5 hash of the email address'),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      mergeFields: z.record(z.string(), z.any()).optional(),
      oldEmail: z.string().optional(),
      newEmail: z.string().optional(),
      campaignSubject: z.string().optional(),
      campaignStatus: z.string().optional(),
      reason: z.string().optional(),
      ipAddress: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new MailchimpClient({
        token: ctx.auth.token,
        serverPrefix: ctx.auth.serverPrefix
      });

      // We need a list ID to register webhooks. Get all lists and register for each.
      let listsResult = await client.getLists({ count: 100 });
      let registrations: Array<{ listId: string; webhookId: string }> = [];

      for (let list of listsResult.lists ?? []) {
        try {
          let result = await client.createWebhook(list.id, {
            url: ctx.input.webhookBaseUrl,
            events: {
              subscribe: true,
              unsubscribe: true,
              profile: true,
              cleaned: true,
              upemail: true,
              campaign: true
            },
            sources: {
              user: true,
              admin: true,
              api: true
            }
          });
          registrations.push({ listId: list.id, webhookId: result.id });
        } catch (_err) {
          // Some lists may not support webhooks; continue with others
        }
      }

      return {
        registrationDetails: { registrations }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new MailchimpClient({
        token: ctx.auth.token,
        serverPrefix: ctx.auth.serverPrefix
      });

      let details = ctx.input.registrationDetails as {
        registrations: Array<{ listId: string; webhookId: string }>;
      };
      for (let reg of details.registrations ?? []) {
        try {
          await client.deleteWebhook(reg.listId, reg.webhookId);
        } catch (_err) {
          // Webhook may already be deleted
        }
      }
    },

    handleRequest: async ctx => {
      // Mailchimp sends webhook payloads as application/x-www-form-urlencoded
      // Also handles GET requests used for webhook URL validation
      let method = ctx.request.method;

      // Mailchimp validates webhook URLs with a GET request
      if (method === 'GET') {
        return { inputs: [] };
      }

      let bodyText = await ctx.request.text();
      let params = new URLSearchParams(bodyText);

      let eventType = params.get('type') ?? '';
      let firedAt = params.get('fired_at') ?? new Date().toISOString();
      let listId = params.get('data[list_id]') ?? '';

      let emailAddress =
        params.get('data[email]') ?? params.get('data[merges][EMAIL]') ?? undefined;
      let oldEmail = params.get('data[old_email]') ?? undefined;
      let newEmail = params.get('data[new_email]') ?? undefined;

      let mergeFields: Record<string, any> = {};
      for (let [key, value] of params.entries()) {
        let match = key.match(/^data\[merges\]\[(.+)\]$/);
        if (match?.[1] && match[1] !== 'EMAIL') {
          mergeFields[match[1]] = value;
        }
      }

      let campaignSubject = params.get('data[subject]') ?? undefined;
      let campaignStatus = params.get('data[status]') ?? undefined;
      let campaignSendTime = params.get('data[send_time]') ?? undefined;

      let rawPayload: Record<string, any> = {};
      for (let [key, value] of params.entries()) {
        rawPayload[key] = value;
      }

      if (
        !eventType ||
        !['subscribe', 'unsubscribe', 'profile', 'cleaned', 'upemail', 'campaign'].includes(
          eventType
        )
      ) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType: eventType as any,
            firedAt,
            listId,
            emailAddress,
            mergeFields: Object.keys(mergeFields).length > 0 ? mergeFields : undefined,
            oldEmail,
            newEmail,
            campaignSubject,
            campaignStatus,
            campaignSendTime,
            rawPayload
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let {
        eventType,
        firedAt,
        listId,
        emailAddress,
        mergeFields,
        oldEmail,
        newEmail,
        campaignSubject,
        campaignStatus,
        rawPayload
      } = ctx.input;

      // Generate a unique event ID from the event type + timestamp + email
      let eventId = `${eventType}_${firedAt}_${emailAddress ?? listId}`;

      let subscriberHash = rawPayload?.['data[id]'] as string | undefined;
      let firstName = mergeFields?.FNAME as string | undefined;
      let lastName = mergeFields?.LNAME as string | undefined;
      let reason = rawPayload?.['data[reason]'] as string | undefined;
      let ipAddress = (rawPayload?.['data[ip_opt]'] ?? rawPayload?.['data[ip_signup]']) as
        | string
        | undefined;

      return {
        type: `audience.${eventType}`,
        id: eventId,
        output: {
          listId,
          emailAddress,
          subscriberHash,
          firstName,
          lastName,
          mergeFields:
            mergeFields && Object.keys(mergeFields).length > 0 ? mergeFields : undefined,
          oldEmail,
          newEmail,
          campaignSubject,
          campaignStatus,
          reason,
          ipAddress
        }
      };
    }
  })
  .build();
