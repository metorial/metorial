import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

export let teamChangeTrigger = SlateTrigger.create(spec, {
  name: 'Team Change',
  key: 'team_change',
  description:
    'Triggers when a team is created, updated, or deleted in the tenant. Uses Microsoft Graph webhooks for real-time notifications.'
})
  .scopes(microsoftTeamsActionScopes.teamChange)
  .input(
    z.object({
      changeType: z.string().describe('Type of change: created, updated, or deleted'),
      resourceUrl: z.string().describe('Resource URL for the changed team'),
      subscriptionId: z.string().describe('Subscription ID'),
      tenantId: z.string().optional().describe('Tenant ID'),
      resourceData: z.any().optional().describe('Resource data included in the notification')
    })
  )
  .output(
    z.object({
      teamId: z.string().describe('ID of the team'),
      changeType: z.string().describe('Type of change: created, updated, or deleted'),
      displayName: z.string().optional().describe('Team display name'),
      description: z.string().nullable().optional().describe('Team description'),
      visibility: z.string().optional().describe('Team visibility')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GraphClient({ token: ctx.auth.token });

      let expirationDateTime = new Date(Date.now() + 55 * 60 * 1000).toISOString();

      let subscription = await client.createSubscription({
        changeType: 'created,updated,deleted',
        notificationUrl: ctx.input.webhookBaseUrl,
        resource: '/teams',
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
      let teamId = teamIdMatch ? teamIdMatch[1] : resourceUrl;

      let output: any = {
        teamId,
        changeType: ctx.input.changeType
      };

      if (teamId && ctx.input.changeType !== 'deleted') {
        try {
          let client = new GraphClient({ token: ctx.auth.token });
          let team = await client.getTeam(teamId);
          output.displayName = team.displayName;
          output.description = team.description;
          output.visibility = team.visibility;
        } catch (_e) {
          // Team may not be accessible
        }
      }

      return {
        type: `team.${ctx.input.changeType}`,
        id: `${ctx.input.subscriptionId}-${teamId}-${ctx.input.changeType}-${Date.now()}`,
        output
      };
    }
  })
  .build();
