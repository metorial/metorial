import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResources, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let listEnvironments = SlateTool.create(spec, {
  name: 'List Environments',
  key: 'list_environments',
  description: `List all environments configured in Rootly (e.g., production, staging, development).
Use this to find environment IDs when creating incidents or alerts.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search environments by keyword'),
      pageNumber: z.number().optional().describe('Page number'),
      pageSize: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      environments: z.array(z.record(z.string(), z.any())).describe('List of environments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listEnvironments({
      search: ctx.input.search,
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let environments = flattenResources(result.data as JsonApiResource[]);

    return {
      output: {
        environments
      },
      message: `Found **${environments.length}** environments.`
    };
  })
  .build();
