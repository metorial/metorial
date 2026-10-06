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
        .enum([
          'list',
          'get',
          'create',
          'update',
          'delete',
          'list_phone_numbers',
          'list_short_codes'
        ])
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
      whitelistedDestinations: z
        .array(z.string())
        .optional()
        .describe(
          'Allowed ISO country codes, or ["*"] to explicitly allow all destinations. Required for create and for updates to legacy profiles without configured destinations.'
        ),
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
            name: z.string().nullish().describe('Profile name'),
            enabled: z.boolean().optional().describe('Whether the profile is enabled'),
            whitelistedDestinations: z
              .array(z.string())
              .optional()
              .describe('Configured destination country allowlist'),
            webhookUrl: z.string().nullish().describe('Webhook URL'),
            createdAt: z.string().nullish().describe('When the profile was created'),
            updatedAt: z.string().nullish().describe('When the profile was last updated')
          })
        )
        .optional()
        .describe('List of profiles (for list action)'),
      associations: z
        .array(
          z.object({
            id: z.string(),
            phoneNumber: z.string().optional(),
            shortCode: z.string().optional()
          })
        )
        .optional()
        .describe('Native phone-number or short-code associations'),
      totalPages: z.number().optional(),
      profile: z
        .object({
          profileId: z.string().describe('Profile ID'),
          organizationId: z.string().optional(),
          webhookApiVersion: z.string().nullish(),
          name: z.string().nullish().describe('Profile name'),
          enabled: z.boolean().optional().describe('Whether enabled'),
          whitelistedDestinations: z
            .array(z.string())
            .optional()
            .describe('Configured destination country allowlist'),
          webhookUrl: z.string().nullish().describe('Webhook URL'),
          webhookFailoverUrl: z.string().nullish().describe('Failover webhook URL'),
          createdAt: z.string().nullish().describe('Created timestamp'),
          updatedAt: z.string().nullish().describe('Updated timestamp')
        })
        .optional()
        .describe('Single profile details'),
      deleted: z.boolean().optional().describe('Whether the profile was deleted'),
      totalResults: z.number().optional().describe('Total results (for list)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list_phone_numbers' || ctx.input.action === 'list_short_codes') {
      const result =
        ctx.input.action === 'list_phone_numbers'
          ? await client.listMessagingProfileNumbers(ctx.input.profileId!, ctx.input)
          : await client.listMessagingProfileShortCodes(ctx.input.profileId!, ctx.input);
      const associations = result.data.map(item => ({
        id: item.id,
        phoneNumber:
          'phone_number' in item && typeof item.phone_number === 'string'
            ? item.phone_number
            : undefined,
        shortCode:
          'short_code' in item && typeof item.short_code === 'string'
            ? item.short_code
            : undefined
      }));
      return {
        output: {
          associations,
          totalResults: result.meta?.total_results,
          totalPages: result.meta?.total_pages
        },
        message: `Read ${associations.length} native association(s).`
      };
    }
    if (ctx.input.action === 'list') {
      let result = await client.listMessagingProfiles({
        pageNumber: ctx.input.pageNumber,
        pageSize: ctx.input.pageSize
      });
      let profiles = (result.data ?? []).map(p => ({
        profileId: p.id,
        name: p.name,
        enabled: p.enabled,
        whitelistedDestinations: p.whitelisted_destinations,
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
        enabled: ctx.input.enabled,
        whitelistedDestinations: ctx.input.whitelistedDestinations
      });
      return {
        output: {
          profile: {
            profileId: result.id,
            organizationId: result.organization_id,
            webhookApiVersion: result.webhook_api_version,
            name: result.name,
            enabled: result.enabled,
            whitelistedDestinations: result.whitelisted_destinations,
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
        enabled: ctx.input.enabled,
        whitelistedDestinations: ctx.input.whitelistedDestinations
      });
      return {
        output: {
          profile: {
            profileId: result.id,
            organizationId: result.organization_id,
            webhookApiVersion: result.webhook_api_version,
            name: result.name,
            enabled: result.enabled,
            whitelistedDestinations: result.whitelisted_destinations,
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
          organizationId: result.organization_id,
          webhookApiVersion: result.webhook_api_version,
          name: result.name,
          enabled: result.enabled,
          whitelistedDestinations: result.whitelisted_destinations,
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
