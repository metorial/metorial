import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let listServerProviders = SlateTool.create(spec, {
  name: 'List Server Providers',
  key: 'list_server_providers',
  description: `List connected cloud server provider accounts (DigitalOcean, Vultr, Linode, AWS Lightsail, Hetzner). Filter by provider name or search by email.
Optionally retrieve available regions and instance sizes for a specific provider to help with server creation.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      provider: z
        .string()
        .optional()
        .describe('Filter by provider name (digitalocean, vultr, linode, lightsail, hetzner)'),
      search: z.string().optional().describe('Search by email'),
      page: z.number().optional().describe('Page number for pagination'),
      providerId: z
        .string()
        .optional()
        .describe('Provider account ID to get regions and sizes'),
      region: z
        .string()
        .optional()
        .describe('Region slug to get available instance sizes (requires providerId)')
    })
  )
  .output(
    z.object({
      providers: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of connected provider accounts'),
      pagination: z.record(z.string(), z.unknown()).optional().describe('Pagination info'),
      regions: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Available regions for the provider'),
      sizes: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Available instance sizes for the region')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    if (ctx.input.providerId && ctx.input.region) {
      let sizes = await client.getProviderSizes(orgId, ctx.input.providerId, ctx.input.region);
      return {
        output: {
          sizes,
          providers: undefined,
          pagination: undefined,
          regions: undefined
        },
        message: `Found **${sizes.length}** instance size(s) in region **${ctx.input.region}**.`
      };
    }

    if (ctx.input.providerId) {
      let regions = await client.getProviderRegions(orgId, ctx.input.providerId);
      return {
        output: {
          regions,
          providers: undefined,
          pagination: undefined,
          sizes: undefined
        },
        message: `Found **${regions.length}** region(s) for provider **${ctx.input.providerId}**.`
      };
    }

    let result = await client.listServerProviders(orgId, {
      page: ctx.input.page,
      provider: ctx.input.provider,
      search: ctx.input.search
    });
    return {
      output: {
        providers: result.providers,
        pagination: result.pagination,
        regions: undefined,
        sizes: undefined
      },
      message: `Found **${result.providers.length}** connected provider account(s).`
    };
  })
  .build();
