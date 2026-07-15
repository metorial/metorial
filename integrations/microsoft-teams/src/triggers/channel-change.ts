import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

export let channelChangeTrigger = SlateTrigger.create(spec, {
  name: 'Channel Change',
  key: 'channel_change',
  description:
    'Triggers when a channel is created, updated, or deleted across teams. Uses Microsoft Graph webhooks for real-time notifications.'
})
  .scopes(microsoftTeamsActionScopes.channelChange)
  .input(
    z.object({
      changeType: z.string().describe('Type of change: created, updated, or deleted'),
      resourceUrl: z.string().describe('Resource URL for the changed channel'),
      subscriptionId: z.string().describe('Subscription ID'),
      tenantId: z.string().optional().describe('Tenant ID'),
      resourceData: z.any().optional().describe('Resource data included in the notification')
    })
  )
  .output(
    z.object({
      channelId: z.string().describe('ID of the channel'),
      teamId: z.string().optional().describe('ID of the team'),
      changeType: z.string().describe('Type of change: created, updated, or deleted'),
      displayName: z.string().optional().describe('Channel display name'),
      description: z.string().nullable().optional().describe('Channel description'),
      membershipType: z
        .string()
        .optional()
        .describe('Channel type: standard, private, or shared')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GraphClient({ token: ctx.auth.token });

      let expirationDateTime = new Date(Date.now() + 55 * 60 * 1000).toISOString();

      let subscription = await client.createSubscription({
        changeType: 'created,updated,deleted',
        notificationUrl: ctx.input.webhookBaseUrl,
        resource: '/teams/getAllChannels',
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

      let teamIdMatch =
        resourceUrl.match(/teams\('([^']+)'\)/) || resourceUrl.match(/teams\/([^/]+)/);
      let channelIdMatch =
        resourceUrl.match(/channels\('([^']+)'\)/) || resourceUrl.match(/channels\/([^/]+)/);

      let teamId = teamIdMatch ? teamIdMatch[1] : undefined;
      let channelId = channelIdMatch ? channelIdMatch[1] : resourceUrl;

      let output: any = {
        channelId,
        teamId,
        changeType: ctx.input.changeType
      };

      if (teamId && channelId && ctx.input.changeType !== 'deleted') {
        try {
          let client = new GraphClient({ token: ctx.auth.token });
          let channel = await client.getChannel(teamId, channelId);
          output.displayName = channel.displayName;
          output.description = channel.description;
          output.membershipType = channel.membershipType;
        } catch (_e) {
          // Channel may not be accessible
        }
      }

      return {
        type: `channel.${ctx.input.changeType}`,
        id: `${ctx.input.subscriptionId}-${channelId}-${ctx.input.changeType}-${Date.now()}`,
        output
      };
    }
  })
  .build();
