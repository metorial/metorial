import { SlateTool } from 'slates';
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

    if (ctx.input.logs) {
      let logData: Record<string, unknown> = {};
      if (ctx.input.logs.enabled !== undefined) logData.logging = ctx.input.logs.enabled;
      if (ctx.input.logs.dropIp !== undefined)
        logData.logging_disable_client = ctx.input.logs.dropIp;
      if (ctx.input.logs.dropDomain !== undefined)
        logData.logging_disable_query = ctx.input.logs.dropDomain;
      if (ctx.input.logs.retention !== undefined)
        logData.logging_retention = ctx.input.logs.retention;
      if (ctx.input.logs.location !== undefined)
        logData.logging_location = ctx.input.logs.location;
      if (Object.keys(logData).length > 0) {
        await client.updateLogSettings(profileId, logData);
      }
    }

    if (ctx.input.blockPage) {
      let blockPageData: Record<string, unknown> = {};
      if (ctx.input.blockPage.enabled !== undefined)
        blockPageData.blockPage = ctx.input.blockPage.enabled;
      if (Object.keys(blockPageData).length > 0) {
        await client.updateBlockPageSettings(profileId, blockPageData);
      }
    }

    if (ctx.input.performance) {
      let perfData: Record<string, unknown> = {};
      if (ctx.input.performance.ecs !== undefined) perfData.ecs = ctx.input.performance.ecs;
      if (ctx.input.performance.cacheBoost !== undefined)
        perfData.cacheBoost = ctx.input.performance.cacheBoost;
      if (ctx.input.performance.cnameFlattening !== undefined)
        perfData.cnameFlattening = ctx.input.performance.cnameFlattening;
      if (Object.keys(perfData).length > 0) {
        await client.updatePerformanceSettings(profileId, perfData);
      }
    }

    if (ctx.input.web3 !== undefined) {
      await client.updateSettings(profileId, { handshake: ctx.input.web3 });
    }

    let settings = await client.getSettings(profileId);

    return {
      output: { settings: settings.data || settings },
      message: `Updated settings for profile \`${profileId}\`.`
    };
  })
  .build();
