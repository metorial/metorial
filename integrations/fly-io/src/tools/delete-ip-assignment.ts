import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteIpAssignment = SlateTool.create(spec, {
  name: 'Delete IP Assignment',
  key: 'delete_ip_assignment',
  description: 'Remove an IP assignment from a Fly App.',
  tags: {
    destructive: true
  },
  constraints: ['Only remove IPs that are known to belong to the app and are safe to release.']
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      ipAddress: z.string().describe('IP address to remove from the app')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the IP assignment was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteIpAssignment(ctx.input.appName, ctx.input.ipAddress);

    return {
      output: { deleted: true },
      message: `Removed IP assignment **${ctx.input.ipAddress}** from app **${ctx.input.appName}**.`
    };
  })
  .build();
