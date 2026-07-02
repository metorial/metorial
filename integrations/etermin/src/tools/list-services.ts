import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listServices = SlateTool.create(spec, {
  name: 'List Services',
  key: 'list_services',
  description: `Retrieve bookable services from eTermin. Optionally filter by service group or enabled status. Returns service details including name, duration, pricing, and capacity settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceGroupId: z.string().optional().describe('Filter by service group ID'),
      serviceId: z.string().optional().describe('Get a specific service by ID'),
      enabled: z
        .string()
        .optional()
        .describe('Filter by enabled status ("1" for enabled, "0" for disabled)')
    })
  )
  .output(
    z.object({
      services: z.array(z.record(z.string(), z.any())).describe('List of service records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.listServices({
      servicegroupid: ctx.input.serviceGroupId,
      id: ctx.input.serviceId,
      enabled: ctx.input.enabled
    });

    let services = Array.isArray(result) ? result : [result];

    return {
      output: { services },
      message: `Found **${services.length}** service(s).`
    };
  })
  .build();
