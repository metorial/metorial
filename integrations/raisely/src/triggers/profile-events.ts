import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let profileEvents = SlateTrigger.create(spec, {
  name: 'Profile Events',
  key: 'profile_events',
  description:
    'Triggers on fundraising profile events: created, updated, deleted, totalUpdated, exerciseTotalUpdated, memberAdded, memberRemoved, joinedTeam, leftTeam, badge.awarded, badge.revoked.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of profile event'),
      profileUuid: z.string().describe('UUID of the profile'),
      profile: z
        .record(z.string(), z.any())
        .describe('Full profile object from the webhook payload')
    })
  )
  .output(
    z.object({
      profileUuid: z.string().describe('UUID of the profile'),
      campaignUuid: z.string().optional().describe('UUID of the campaign'),
      userUuid: z.string().optional().describe('UUID of the profile owner'),
      name: z.string().optional().describe('Profile name'),
      profileType: z.string().optional().describe('Profile type (individual, team, group)'),
      goal: z.number().optional().describe('Fundraising goal in smallest currency unit'),
      total: z.number().optional().describe('Total raised in smallest currency unit'),
      currency: z.string().optional().describe('Currency code'),
      parentUuid: z.string().optional().describe('Parent profile UUID'),
      isActive: z.boolean().optional().describe('Whether the profile is active'),
      createdAt: z.string().optional().describe('When the profile was created')
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
      if (!type.startsWith('profile.')) {
        return { inputs: [] };
      }
      let eventType = type.replace('profile.', '');
      let profile = (data.data || {}) as Record<string, any>;
      return {
        inputs: [
          {
            eventType,
            profileUuid: String(profile.uuid || data.uuid || ''),
            profile
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let p = ctx.input.profile as Record<string, any>;
      return {
        type: `profile.${ctx.input.eventType}`,
        id: ctx.input.profileUuid,
        output: {
          profileUuid: String(p.uuid || ctx.input.profileUuid),
          campaignUuid: p.campaignUuid as string | undefined,
          userUuid: p.userUuid as string | undefined,
          name: p.name as string | undefined,
          profileType: p.type as string | undefined,
          goal: p.goal as number | undefined,
          total: p.total as number | undefined,
          currency: p.currency as string | undefined,
          parentUuid: p.parentUuid as string | undefined,
          isActive: p.isActive as boolean | undefined,
          createdAt: p.createdAt as string | undefined
        }
      };
    }
  })
  .build();
