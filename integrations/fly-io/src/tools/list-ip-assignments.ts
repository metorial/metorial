import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listIpAssignments = SlateTool.create(spec, {
  name: 'List IP Assignments',
  key: 'list_ip_assignments',
  description:
    'List public IP assignments for a Fly App, including shared status, region, and service name.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App')
    })
  )
  .output(
    z.object({
      ipAssignments: z
        .array(
          z.object({
            ipAddress: z.string().describe('Assigned IP address'),
            region: z.string().describe('Region for the assignment'),
            serviceName: z.string().describe('Service name'),
            shared: z.boolean().describe('Whether the IP is shared'),
            createdAt: z.string().describe('Assignment creation timestamp')
          })
        )
        .describe('IP assignments')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let ipAssignments = await client.listIpAssignments(ctx.input.appName);

    return {
      output: { ipAssignments },
      message: `Found **${ipAssignments.length}** IP assignment(s) for app **${ctx.input.appName}**.`
    };
  })
  .build();
