import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { spec } from '../spec';

export let manageMessagingProfile = SlateTool.create(spec, {
  name: 'Manage Messaging Profile',
  key: 'manage_messaging_profile',
  description: `Create, get, update, delete, or list messaging profiles. Messaging profiles configure how messages are sent and where webhooks are delivered. Every messaging-enabled number must be assigned to a messaging profile.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      profileId: z
        .string()
        .optional()
        .describe('Messaging profile ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Profile name (required for create, optional for update)'),
      webhookUrl: z.string().optional().describe('Webhook URL for message events'),
      webhookFailoverUrl: z.string().optional().describe('Failover webhook URL'),
      webhookApiVersion: z.enum(['1', '2']).optional().describe('Webhook API version'),
      enabled: z.boolean().optional().describe('Whether the profile is enabled'),
      pageNumber: z.number().optional().describe('Page number for list action'),
      pageSize: z.number().optional().describe('Page size for list action')
    })
  )
  .output(
    z.object({
      profiles: z
        .array(
          z.object({
            profileId: z.string().describe('Profile ID'),
            name: z.string().optional().describe('Profile name'),
            enabled: z.boolean().optional().describe('Whether the profile is enabled'),
            webhookUrl: z.string().optional().describe('Webhook URL'),
            createdAt: z.string().optional().describe('When the profile was created'),
            updatedAt: z.string().optional().describe('When the profile was last updated')
          })
        )
        .optional()
        .describe('List of profiles (for list action)'),
      profile: z
        .object({
          profileId: z.string().describe('Profile ID'),
          name: z.string().optional().describe('Profile name'),
          enabled: z.boolean().optional().describe('Whether enabled'),
          webhookUrl: z.string().optional().describe('Webhook URL'),
          webhookFailoverUrl: z.string().optional().describe('Failover webhook URL'),
          createdAt: z.string().optional().describe('Created timestamp'),
          updatedAt: z.string().optional().describe('Updated timestamp')
        })
        .optional()
        .describe('Single profile details'),
      deleted: z.boolean().optional().describe('Whether the profile was deleted'),
      totalResults: z.number().optional().describe('Total results (for list)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listMessagingProfiles({
        pageNumber: ctx.input.pageNumber,
        pageSize: ctx.input.pageSize
      });
      let profiles = (result.data ?? []).map((p: any) => ({
        profileId: p.id,
        name: p.name,
        enabled: p.enabled,
        webhookUrl: p.webhook_url,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));
      return {
        output: { profiles, totalResults: result.meta?.total_results },
        message: `Found **${profiles.length}** messaging profile(s).`
      };
    }

    if (ctx.input.action === 'create') {
      let result = await client.createMessagingProfile({
        name: ctx.input.name!,
        webhookUrl: ctx.input.webhookUrl,
        webhookFailoverUrl: ctx.input.webhookFailoverUrl,
        webhookApiVersion: ctx.input.webhookApiVersion,
        enabled: ctx.input.enabled
      });
      return {
        output: {
          profile: {
            profileId: result.id,
            name: result.name,
            enabled: result.enabled,
            webhookUrl: result.webhook_url,
            webhookFailoverUrl: result.webhook_failover_url,
            createdAt: result.created_at,
            updatedAt: result.updated_at
          }
        },
        message: `Created messaging profile **${result.name}** (ID: ${result.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteMessagingProfile(ctx.input.profileId!);
      return {
        output: { deleted: true },
        message: `Deleted messaging profile **${ctx.input.profileId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateMessagingProfile(ctx.input.profileId!, {
        name: ctx.input.name,
        webhookUrl: ctx.input.webhookUrl,
        webhookFailoverUrl: ctx.input.webhookFailoverUrl,
        webhookApiVersion: ctx.input.webhookApiVersion,
        enabled: ctx.input.enabled
      });
      return {
        output: {
          profile: {
            profileId: result.id,
            name: result.name,
            enabled: result.enabled,
            webhookUrl: result.webhook_url,
            webhookFailoverUrl: result.webhook_failover_url,
            createdAt: result.created_at,
            updatedAt: result.updated_at
          }
        },
        message: `Updated messaging profile **${result.name}**.`
      };
    }

    // get
    let result = await client.getMessagingProfile(ctx.input.profileId!);
    return {
      output: {
        profile: {
          profileId: result.id,
          name: result.name,
          enabled: result.enabled,
          webhookUrl: result.webhook_url,
          webhookFailoverUrl: result.webhook_failover_url,
          createdAt: result.created_at,
          updatedAt: result.updated_at
        }
      },
      message: `Messaging profile **${result.name}** (${result.enabled ? 'enabled' : 'disabled'}).`
    };
  })
  .build();
