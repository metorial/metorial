import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let assignIpAddress = SlateTool.create(spec, {
  name: 'Assign IP Address',
  key: 'assign_ip_address',
  description:
    'Assign a new IP address to a Fly App. Use this when an app needs a public IPv4, IPv6, or service-specific address.',
  constraints: [
    'IP assignment can affect account billing or scarce shared account resources depending on address type.'
  ]
})
  .input(
    z.object({
      appName: z.string().describe('Name of the Fly App'),
      type: z.string().describe('Fly.io IP assignment type, such as shared_v4, v4, or v6'),
      orgSlug: z.string().optional().describe('Organization slug for the assignment'),
      region: z.string().optional().describe('Region code for regional assignments'),
      network: z.string().optional().describe('Network name for private networking'),
      serviceName: z.string().optional().describe('Service name to associate with the IP')
    })
  )
  .output(
    z.object({
      ipAddress: z.string().describe('Assigned IP address'),
      region: z.string().describe('Region for the assignment'),
      serviceName: z.string().describe('Service name'),
      shared: z.boolean().describe('Whether the IP is shared'),
      createdAt: z.string().describe('Assignment creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let assignment = await client.assignIpAddress(ctx.input.appName, {
      type: ctx.input.type,
      orgSlug: ctx.input.orgSlug,
      region: ctx.input.region,
      network: ctx.input.network,
      serviceName: ctx.input.serviceName
    });

    return {
      output: assignment,
      message: `Assigned IP **${assignment.ipAddress}** to app **${ctx.input.appName}**.`
    };
  })
  .build();
