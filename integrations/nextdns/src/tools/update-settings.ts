import { createApiServiceError, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { NextDnsClient } from '../lib/client';
import { spec } from '../spec';

export let updateSettings = SlateTool.create(spec, {
  name: 'Update Profile Settings',
  key: 'update_settings',
  description: `Update operational settings for a NextDNS profile. Configure logging (enable/disable, retention, location, privacy options), block page display, performance options (ECS, cache boost, CNAME flattening), and Web3 domain resolution. Only provide the fields you want to change.`,
  instructions: [
    'All fields are optional; only provided values are updated.',
    'Log retention is specified in seconds (e.g., 2592000 for 30 days).',
    'Log location options: "us", "eu", "uk", "ch".'
  ]
})
  .input(
    z.object({
      profileId: z.string().describe('ID of the profile to update'),
      logs: z
        .object({
          enabled: z.boolean().optional().describe('Enable/disable logging'),
          dropIp: z.boolean().optional().describe('Drop client IP addresses from logs'),
          dropDomain: z.boolean().optional().describe('Drop domain names from logs'),
          retention: z.number().optional().describe('Log retention period in seconds'),
          location: z
            .string()
            .optional()
            .describe('Log storage location ("us", "eu", "uk", "ch")')
        })
        .optional()
        .describe('Logging settings'),
      blockPage: z
        .object({
          enabled: z.boolean().optional().describe('Enable/disable the block page')
        })
        .optional()
        .describe('Block page settings'),
      performance: z
        .object({
          ecs: z.boolean().optional().describe('Enable/disable EDNS Client Subnet'),
          cacheBoost: z.boolean().optional().describe('Enable/disable cache boost'),
          cnameFlattening: z.boolean().optional().describe('Enable/disable CNAME flattening')
        })
        .optional()
        .describe('Performance settings'),
      web3: z.boolean().optional().describe('Enable/disable Web3 domain resolution')
    })
  )
  .output(
    z.object({
      settings: z.record(z.string(), z.unknown()).describe('Updated profile settings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NextDnsClient({ token: ctx.auth.token });
    let { profileId } = ctx.input;

    if (
      ctx.input.logs?.retention !== undefined &&
      (!Number.isInteger(ctx.input.logs.retention) || ctx.input.logs.retention < 0)
    ) {
      throw createApiServiceError('Log retention must be a non-negative integer in seconds.', {
        reason: 'nextdns_invalid_log_retention'
      });
    }

    if (ctx.input.logs) {
      let drop = pickDefined({ ip: ctx.input.logs.dropIp, domain: ctx.input.logs.dropDomain });
      let logData = pickDefined({
        enabled: ctx.input.logs.enabled,
        drop: Object.keys(drop).length > 0 ? drop : undefined,
        retention: ctx.input.logs.retention,
        location: ctx.input.logs.location
      });
      if (Object.keys(logData).length > 0) {
        await client.updateLogSettings(profileId, logData);
      }
    }

    if (ctx.input.blockPage) {
      let blockPageData = pickDefined(ctx.input.blockPage);
      if (Object.keys(blockPageData).length > 0) {
        await client.updateBlockPageSettings(profileId, blockPageData);
      }
    }

    if (ctx.input.performance) {
      let perfData = pickDefined(ctx.input.performance);
      if (Object.keys(perfData).length > 0) {
        await client.updatePerformanceSettings(profileId, perfData);
      }
    }

    if (ctx.input.web3 !== undefined) {
      await client.updateSettings(profileId, { web3: ctx.input.web3 });
    }

    let settings = await client.getSettings(profileId);

    return {
      output: { settings: settings.data || settings },
      message: `Updated settings for profile \`${profileId}\`.`
    };
  })
  .build();
