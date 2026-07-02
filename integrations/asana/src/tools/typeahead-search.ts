import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let typeaheadSearch = SlateTool.create(spec, {
  name: 'Typeahead Search',
  key: 'typeahead_search',
  description: `Search Asana workspace objects with the low-latency typeahead endpoint. Use this to discover project, project template, portfolio, tag, task, user, or custom field GIDs for other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      workspaceId: z.string().describe('Workspace GID to search in.'),
      resourceType: z
        .enum([
          'custom_field',
          'project',
          'project_template',
          'portfolio',
          'tag',
          'task',
          'user'
        ])
        .describe('Type of Asana resource to search for.'),
      query: z
        .string()
        .optional()
        .describe('Search text. Omit or pass an empty string for relevant defaults.'),
      count: z.number().optional().describe('Maximum number of results to return.')
    })
  )
  .output(
    z.object({
      results: z.array(
        z.object({
          id: z.string(),
          name: z.string().optional(),
          resourceType: z.string().optional()
        })
      ),
      resultCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.typeahead(
      ctx.input.workspaceId,
      ctx.input.resourceType,
      ctx.input.query ?? '',
      ctx.input.count
    );

    let results = (result.data || []).map((item: any) => ({
      id: item.gid,
      name: item.name,
      resourceType: item.resource_type
    }));

    return {
      output: { results, resultCount: results.length },
      message: `Found **${results.length}** typeahead result(s).`
    };
  })
  .build();
