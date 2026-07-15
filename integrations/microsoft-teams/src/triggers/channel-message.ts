import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

export let channelMessageTrigger = SlateTrigger.create(spec, {
  name: 'Channel Message',
  key: 'channel_message',
  description:
    'Triggers when a new message is posted or updated in a team channel. Uses Microsoft Graph webhooks to receive real-time notifications.'
})
  .scopes(microsoftTeamsActionScopes.channelMessage)
  .input(
    z.object({
      changeType: z.string().describe('Type of change: created, updated, or deleted'),
      resourceUrl: z.string().describe('Resource URL for the changed message'),
      subscriptionId: z.string().describe('Subscription ID'),
      tenantId: z.string().optional().describe('Tenant ID'),
      resourceData: z.any().optional().describe('Resource data included in the notification')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the message'),
      teamId: z.string().optional().describe('ID of the team'),
      channelId: z.string().optional().describe('ID of the channel'),
      changeType: z.string().describe('Type of change: created, updated, or deleted'),
      content: z.string().nullable().optional().describe('Message content'),
      contentType: z.string().optional().describe('Content type (text or html)'),
      senderDisplayName: z
        .string()
        .nullable()
        .optional()
        .describe('Display name of the sender'),
      senderUserId: z.string().nullable().optional().describe('User ID of the sender'),
      createdDateTime: z.string().optional().describe('When the message was created'),
      webUrl: z.string().optional().describe('URL to the message in Teams')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GraphClient({ token: ctx.auth.token });

      let expirationDateTime = new Date(Date.now() + 55 * 60 * 1000).toISOString();

      let subscription = await client.createSubscription({
        changeType: 'created,updated',
        notificationUrl: ctx.input.webhookBaseUrl,
        resource: '/teams/getAllMessages',
        expirationDateTime,
        includeResourceData: false
      });

      return {
        registrationDetails: {
          subscriptionId: subscription.id,
          expirationDateTime: subscription.expirationDateTime
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new GraphClient({ token: ctx.auth.token });
      await client.deleteSubscription(ctx.input.registrationDetails.subscriptionId);
    },

    handleRequest: async ctx => {
      let url = new URL(ctx.request.url);
      let validationToken = url.searchParams.get('validationToken');

      if (validationToken) {
        return {
          inputs: [],
          response: new Response(validationToken, {
            status: 200,
            headers: { 'Content-Type': 'text/plain' }
          })
        } as any;
      }

      let body = (await ctx.request.json()) as any;
      let notifications = body.value || [];

      let inputs = notifications.map((n: any) => ({
        changeType: n.changeType,
        resourceUrl: n.resource,
        subscriptionId: n.subscriptionId,
        tenantId: n.tenantId,
        resourceData: n.resourceData
      }));

      return { inputs };
    },

    handleEvent: async ctx => {
      let resourceUrl = ctx.input.resourceUrl || '';

      let teamIdMatch = resourceUrl.match(/teams\('([^']+)'\)/);
      let channelIdMatch = resourceUrl.match(/channels\('([^']+)'\)/);
      let messageIdMatch = resourceUrl.match(/messages\('([^']+)'\)/);

      let teamId = teamIdMatch ? teamIdMatch[1] : undefined;
      let channelId = channelIdMatch ? channelIdMatch[1] : undefined;
      let messageId = messageIdMatch ? messageIdMatch[1] : resourceUrl;

      let output: any = {
        messageId,
        teamId,
        channelId,
        changeType: ctx.input.changeType
      };

      if (teamId && channelId && messageId && ctx.input.changeType !== 'deleted') {
        try {
          let client = new GraphClient({ token: ctx.auth.token });
          let message = await client.getChannelMessage(teamId, channelId, messageId);
          output.content = message.body?.content || null;
          output.contentType = message.body?.contentType;
          output.senderDisplayName = message.from?.user?.displayName || null;
          output.senderUserId = message.from?.user?.id || null;
          output.createdDateTime = message.createdDateTime;
          output.webUrl = message.webUrl;
        } catch (_e) {
          // If we can't fetch message details, return what we have
        }
      }

      return {
        type: `channel_message.${ctx.input.changeType}`,
        id: `${ctx.input.subscriptionId}-${messageId}-${ctx.input.changeType}`,
        output
      };
    }
  })
  .build();
