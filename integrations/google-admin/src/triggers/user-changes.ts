import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { googleAdminActionScopes } from '../scopes';
import { spec } from '../spec';

export let userChanges = SlateTrigger.create(spec, {
  name: 'User Changes',
  key: 'user_changes',
  description:
    'Receive real-time notifications when user accounts are created, updated, deleted, restored, or have their admin status changed in the Google Workspace domain.'
})
  .scopes(googleAdminActionScopes.userChanges)
  .input(
    z.object({
      eventType: z.string().describe('Type of user change event'),
      channelId: z.string().describe('ID of the notification channel'),
      resourceId: z.string().describe('Resource ID from the notification'),
      resourceState: z.string().describe('State of the resource change'),
      resourceUri: z.string().optional().describe('URI of the changed resource'),
      messageNumber: z.string().optional().describe('Notification message number'),
      channelToken: z.string().optional().describe('Channel verification token')
    })
  )
  .output(
    z.object({
      userId: z.string().optional().describe('ID of the affected user'),
      primaryEmail: z.string().optional().describe('Primary email of the affected user'),
      name: z
        .object({
          givenName: z.string().optional(),
          familyName: z.string().optional(),
          fullName: z.string().optional()
        })
        .optional()
        .describe('Name of the affected user'),
      orgUnitPath: z.string().optional().describe('Org unit path of the user'),
      isAdmin: z.boolean().optional().describe('Whether the user is an admin'),
      suspended: z.boolean().optional().describe('Whether the user is suspended'),
      changeType: z.string().describe('Type of change that occurred')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        customerId: ctx.config.customerId,
        domain: ctx.config.domain
      });

      let channelId = crypto.randomUUID();

      let result = await client.watchUsers({
        domain: ctx.config.domain,
        channelId,
        channelAddress: ctx.input.webhookBaseUrl,
        ttl: 86400 // 24 hours
      });

      return {
        registrationDetails: {
          channelId: result.id,
          resourceId: result.resourceId,
          expiration: result.expiration
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        customerId: ctx.config.customerId,
        domain: ctx.config.domain
      });

      await client.stopChannel(
        ctx.input.registrationDetails.channelId,
        ctx.input.registrationDetails.resourceId
      );
    },

    handleRequest: async ctx => {
      let resourceState = ctx.request.headers.get('x-goog-resource-state') || '';

      // Google sends a "sync" message when the channel is first created - acknowledge but don't process
      if (resourceState === 'sync') {
        return { inputs: [] };
      }

      let channelId = ctx.request.headers.get('x-goog-channel-id') || '';
      let resourceId = ctx.request.headers.get('x-goog-resource-id') || '';
      let resourceUri = ctx.request.headers.get('x-goog-resource-uri') || '';
      let messageNumber = ctx.request.headers.get('x-goog-message-number') || '';
      let channelToken = ctx.request.headers.get('x-goog-channel-token') || '';

      // Map Google's resource state to a meaningful event type
      let eventType = resourceState;

      return {
        inputs: [
          {
            eventType,
            channelId,
            resourceId,
            resourceState,
            resourceUri: resourceUri || undefined,
            messageNumber: messageNumber || undefined,
            channelToken: channelToken || undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        customerId: ctx.config.customerId,
        domain: ctx.config.domain
      });

      // Attempt to fetch the user details from the resource URI if available
      let user: any = {};
      if (ctx.input.resourceUri) {
        try {
          // The resource URI might contain user info, try to fetch updated user data
          // Extract the user key from the URI if possible
          let uriMatch = ctx.input.resourceUri.match(/\/users\/([^?]+)/);
          if (uriMatch?.[1]) {
            user = await client.getUser(decodeURIComponent(uriMatch[1]));
          }
        } catch {
          // User might have been deleted, that's OK
        }
      }

      let changeType = ctx.input.resourceState;

      return {
        type: `user.${changeType}`,
        id: `${ctx.input.channelId}-${ctx.input.messageNumber || ctx.input.resourceId}-${Date.now()}`,
        output: {
          userId: user.id,
          primaryEmail: user.primaryEmail,
          name: user.name
            ? {
                givenName: user.name.givenName,
                familyName: user.name.familyName,
                fullName: user.name.fullName
              }
            : undefined,
          orgUnitPath: user.orgUnitPath,
          isAdmin: user.isAdmin,
          suspended: user.suspended,
          changeType
        }
      };
    }
  })
  .build();
