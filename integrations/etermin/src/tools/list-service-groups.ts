import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listServiceGroups = SlateTool.create(spec, {
  name: 'List Service Groups',
  key: 'list_service_groups',
  description: `Retrieve all service groups (categories) from eTermin. Service groups organize bookable services into categories. Use the group IDs when creating or filtering services.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      serviceGroups: z
        .array(z.record(z.string(), z.any()))
        .describe('List of service group records')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.listServiceGroups();

    let serviceGroups = Array.isArray(result) ? result : [result];

    return {
      output: { serviceGroups },
      message: `Found **${serviceGroups.length}** service group(s).`
    };
  })
  .build();
