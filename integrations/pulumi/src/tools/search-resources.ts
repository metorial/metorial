import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, connectionApiBaseUrl, organization } from '../lib/client';
import { organizationInput } from '../lib/schemas';
import { spec } from '../spec';

export let searchResources = SlateTool.create(spec, {
  name: 'Search Resources',
  key: 'search_resources',
  description: `Search across all cloud resources managed by Pulumi in your organization using Pulumi query syntax. Useful for auditing, incident response, and resource discovery.`,
  instructions: [
    'Query syntax examples: `type:aws:s3/bucket:Bucket`, `project:my-project stack:production`, `type:aws:rds/cluster:Cluster .engine:aurora`',
    'Use dot-prefixed filters for resource properties (e.g., `.instanceType:t3.micro`).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      organization: organizationInput,
      query: z.string().describe('Search query using Pulumi query syntax'),
      includeProperties: z
        .boolean()
        .optional()
        .describe('Include resource property data in results'),
      page: z.number().optional().describe('Nonnegative page number'),
      size: z.number().optional().describe('Positive results per page'),
      cursor: z.string().optional().describe('Provider cursor from the preceding search page')
    })
  )
  .output(
    z.object({
      resources: z.array(z.any()),
      total: z.number().optional(),
      returnedCount: z.number().optional(),
      pagination: z
        .object({
          next: z.string().optional(),
          previous: z.string().optional(),
          cursor: z.string().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: connectionApiBaseUrl(ctx.auth, ctx.config)
    });

    let org = organization(ctx.input.organization, ctx.config.organization);

    let result = await client.searchResources(
      org,
      ctx.input.query,
      ctx.input.includeProperties,
      { page: ctx.input.page, size: ctx.input.size, cursor: ctx.input.cursor }
    );

    let resources = result.resources;

    return {
      output: {
        resources,
        total: result.total,
        returnedCount: resources.length,
        pagination: result.pagination
      },
      message: `Found **${resources.length}** resource(s) matching query \`${ctx.input.query}\` in organization **${org}**`
    };
  })
  .build();
