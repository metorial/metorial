import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { spec } from '../spec';

export let manageVerifyProfile = SlateTool.create(spec, {
  name: 'Manage Verify Profile',
  key: 'manage_verify_profile',
  description: `Create, get, update, delete, or list Verify profiles for two-factor authentication. Verify profiles configure verification settings like timeout, webhook URLs, and templates.`,
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
        .describe('Verify profile ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Profile name (required for create, optional for update)'),
      webhookUrl: z.string().optional().describe('Webhook URL for verification events'),
      webhookFailoverUrl: z.string().optional().describe('Failover webhook URL'),
      channelSettings: z
        .object({
          sms: z.record(z.string(), z.unknown()).optional(),
          call: z.record(z.string(), z.unknown()).optional(),
          flashcall: z.record(z.string(), z.unknown()).optional(),
          whatsapp: z.record(z.string(), z.unknown()).optional()
        })
        .optional()
        .describe(
          'Native channel settings, including default_verification_timeout_secs; flashcall is create-only'
        ),
      defaultTimeoutSecs: z
        .number()
        .optional()
        .describe('Legacy aggregate timeout is unsupported; use channelSettings per channel'),
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
            webhookUrl: z.string().nullish().describe('Webhook URL'),
            createdAt: z.string().nullish().describe('Created timestamp'),
            updatedAt: z.string().nullish().describe('Updated timestamp')
          })
        )
        .optional()
        .describe('List of verify profiles'),
      profile: z
        .object({
          profileId: z.string().describe('Profile ID'),
          name: z.string().nullish().describe('Profile name'),
          webhookUrl: z.string().nullish().describe('Webhook URL'),
          webhookFailoverUrl: z.string().nullish().describe('Failover webhook URL'),
          defaultTimeoutSecs: z
            .number()
            .optional()
            .describe(
              'Legacy aggregate field; omitted because native timeouts are per channel'
            ),
          channelSettings: z
            .object({
              sms: z.record(z.string(), z.unknown()).optional(),
              call: z.record(z.string(), z.unknown()).optional(),
              flashcall: z.record(z.string(), z.unknown()).optional(),
              whatsapp: z.record(z.string(), z.unknown()).optional()
            })
            .optional(),
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

    if (ctx.input.action === 'list') {
      let result = await client.listVerifyProfiles({
        pageNumber: ctx.input.pageNumber,
        pageSize: ctx.input.pageSize
      });
      let profiles = (result.data ?? []).map(p => ({
        profileId: p.id,
        name: p.name,
        webhookUrl: p.webhook_url,
        createdAt: p.created_at,
        updatedAt: p.updated_at
      }));
      return {
        output: { profiles, totalResults: result.meta?.total_results },
        message: `Found **${profiles.length}** verify profile(s).`
      };
    }

    if (ctx.input.action === 'create') {
      let result = await client.createVerifyProfile({
        name: ctx.input.name!,
        webhookUrl: ctx.input.webhookUrl,
        webhookFailoverUrl: ctx.input.webhookFailoverUrl,
        defaultTimeoutSecs: ctx.input.defaultTimeoutSecs,
        channelSettings: ctx.input.channelSettings
      });
      return {
        output: {
          profile: {
            profileId: result.id,
            name: result.name,
            webhookUrl: result.webhook_url,
            webhookFailoverUrl: result.webhook_failover_url,
            channelSettings: {
              sms: result.sms,
              call: result.call,
              flashcall: result.flashcall,
              whatsapp: result.whatsapp
            },
            createdAt: result.created_at,
            updatedAt: result.updated_at
          }
        },
        message: `Created verify profile **${result.name}** (ID: ${result.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteVerifyProfile(ctx.input.profileId!);
      return {
        output: { deleted: true },
        message: `Deleted verify profile **${ctx.input.profileId}**.`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateVerifyProfile(ctx.input.profileId!, {
        name: ctx.input.name,
        webhookUrl: ctx.input.webhookUrl,
        webhookFailoverUrl: ctx.input.webhookFailoverUrl,
        defaultTimeoutSecs: ctx.input.defaultTimeoutSecs,
        channelSettings: ctx.input.channelSettings
      });
      return {
        output: {
          profile: {
            profileId: result.id,
            name: result.name,
            webhookUrl: result.webhook_url,
            webhookFailoverUrl: result.webhook_failover_url,
            channelSettings: {
              sms: result.sms,
              call: result.call,
              flashcall: result.flashcall,
              whatsapp: result.whatsapp
            },
            createdAt: result.created_at,
            updatedAt: result.updated_at
          }
        },
        message: `Updated verify profile **${result.name}**.`
      };
    }

    // get
    let result = await client.getVerifyProfile(ctx.input.profileId!);
    return {
      output: {
        profile: {
          profileId: result.id,
          name: result.name,
          webhookUrl: result.webhook_url,
          webhookFailoverUrl: result.webhook_failover_url,
          channelSettings: {
            sms: result.sms,
            call: result.call,
            flashcall: result.flashcall,
            whatsapp: result.whatsapp
          },
          createdAt: result.created_at,
          updatedAt: result.updated_at
        }
      },
      message: `Verify profile **${result.name}**.`
    };
  })
  .build();
