import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

export let membershipChangeTrigger = SlateTrigger.create(spec, {
  name: 'Membership Change',
  key: 'membership_change',
  description:
    'Triggers when members are added, updated, or removed from a specific team. Uses Microsoft Graph webhooks for real-time membership notifications.'
})
  .scopes(microsoftTeamsActionScopes.membershipChange)
  .input(
    z.object({
      changeType: z.string().describe('Type of change: created, updated, or deleted'),
      resourceUrl: z.string().describe('Resource URL for the changed membership'),
      subscriptionId: z.string().describe('Subscription ID'),
      tenantId: z.string().optional().describe('Tenant ID'),
      resourceData: z.any().optional().describe('Resource data included in the notification')
    })
  )
  .output(
    z.object({
      membershipId: z.string().describe('Membership entry ID'),
      teamId: z.string().optional().describe('ID of the team'),
      changeType: z.string().describe('Type of change: created, updated, or deleted'),
      displayName: z.string().nullable().optional().describe('Member display name'),
      userId: z.string().nullable().optional().describe('Member user ID'),
      email: z.string().nullable().optional().describe('Member email'),
      roles: z.array(z.string()).optional().describe('Member roles')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new GraphClient({ token: ctx.auth.token });

      let expirationDateTime = new Date(Date.now() + 55 * 60 * 1000).toISOString();

      let subscription = await client.createSubscription({
        changeType: 'created,updated,deleted',
        notificationUrl: ctx.input.webhookBaseUrl,
        resource: '/teams/getAllMembers',
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
      let memberIdMatch =
        resourceUrl.match(/members\('([^']+)'\)/) || resourceUrl.match(/members\/([^/]+)/);

      let teamId = teamIdMatch ? teamIdMatch[1] : undefined;
      let membershipId = memberIdMatch ? memberIdMatch[1] : resourceUrl;

      let output: any = {
        membershipId,
        teamId,
        changeType: ctx.input.changeType
      };

      if (ctx.input.resourceData) {
        output.displayName = ctx.input.resourceData.displayName;
        output.userId = ctx.input.resourceData.userId;
        output.email = ctx.input.resourceData.email;
        output.roles = ctx.input.resourceData.roles;
      }

      return {
        type: `membership.${ctx.input.changeType}`,
        id: `${ctx.input.subscriptionId}-${membershipId}-${ctx.input.changeType}-${Date.now()}`,
        output
      };
    }
  })
  .build();
