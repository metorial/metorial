import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { cloudflareServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageZoneTool = SlateTool.create(spec, {
  name: 'Manage Zone',
  key: 'manage_zone',
  description: `Create or delete a domain (zone) on Cloudflare, or retrieve detailed zone information. When creating a zone, Cloudflare will attempt to automatically import existing DNS records.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'delete']).describe('Operation to perform'),
      zoneId: z.string().optional().describe('Zone ID (required for get and delete)'),
      name: z
        .string()
        .optional()
        .describe('Domain name to add (required for create, e.g. example.com)'),
      accountId: z.string().optional().describe('Account ID (required for create)'),
      type: z
        .enum(['full', 'partial', 'secondary'])
        .optional()
        .describe('Zone type. "full" requires changing nameservers.'),
      jumpStart: z
        .boolean()
        .optional()
        .describe('Whether to auto-import existing DNS records on create')
    })
  )
  .output(
    z.object({
      zoneId: z.string(),
      name: z.string().optional(),
      status: z.string().optional(),
      nameServers: z.array(z.string()).optional(),
      plan: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name)
        throw cloudflareServiceError('name is required for creating a zone');
      let accountId = ctx.input.accountId || ctx.config.accountId;
      if (!accountId)
        throw cloudflareServiceError('accountId is required for creating a zone');

      let response = await client.createZone({
        name: ctx.input.name,
        accountId,
        type: ctx.input.type,
        jumpStart: ctx.input.jumpStart
      });

      let z = response.result;
      return {
        output: {
          zoneId: z.id,
          name: z.name,
          status: z.status,
          nameServers: z.name_servers || [],
          plan: z.plan?.name
        },
        message: `Created zone **${z.name}**. Status: ${z.status}. Update nameservers to: ${(z.name_servers || []).join(', ')}`
      };
    }

    if (action === 'get') {
      if (!ctx.input.zoneId) throw cloudflareServiceError('zoneId is required');
      let response = await client.getZone(ctx.input.zoneId);
      let z = response.result;
      return {
        output: {
          zoneId: z.id,
          name: z.name,
          status: z.status,
          nameServers: z.name_servers || [],
          plan: z.plan?.name
        },
        message: `Zone **${z.name}** — Status: ${z.status}, Plan: ${z.plan?.name || 'N/A'}`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.zoneId)
        throw cloudflareServiceError('zoneId is required for deleting a zone');
      let response = await client.deleteZone(ctx.input.zoneId);
      return {
        output: { zoneId: response.result.id },
        message: `Deleted zone \`${ctx.input.zoneId}\`.`
      };
    }

    throw cloudflareServiceError(`Unknown action: ${action}`);
  })
  .build();
