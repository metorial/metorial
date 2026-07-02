import { SlateTool } from 'slates';
import { z } from 'zod';
import { ServerAvatarClient } from '../lib/client';
import { spec } from '../spec';

export let listBackups = SlateTool.create(spec, {
  name: 'List Backups',
  key: 'list_backups',
  description: `List all backups across an organization with pagination. Returns backup details including status, size, storage provider, and associated application/database information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      backups: z.array(z.record(z.string(), z.unknown())).describe('List of backups'),
      pagination: z.record(z.string(), z.unknown()).describe('Pagination info')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ServerAvatarClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId) throw new Error('organizationId is required either in input or config');

    let result = await client.listBackups(orgId, ctx.input.page);
    return {
      output: {
        backups: result.backups,
        pagination: result.pagination
      },
      message: `Found **${result.backups.length}** backup(s).`
    };
  })
  .build();
