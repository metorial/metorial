import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResources, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let listSeverities = SlateTool.create(spec, {
  name: 'List Severities',
  key: 'list_severities',
  description: `List all severity levels configured in the Rootly organization.
Use this to find severity IDs when creating or updating incidents.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      severities: z.array(z.record(z.string(), z.any())).describe('List of severity levels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSeverities({
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let severities = flattenResources(result.data as JsonApiResource[]);

    return {
      output: {
        severities
      },
      message: `Found **${severities.length}** severity levels.`
    };
  })
  .build();
