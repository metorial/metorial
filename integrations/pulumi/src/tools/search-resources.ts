import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      organization: z
        .string()
        .optional()
        .describe('Organization name (uses default from config if not set)'),
      query: z.string().describe('Search query using Pulumi query syntax'),
      includeProperties: z
        .boolean()
        .optional()
        .describe('Include resource property data in results')
    })
  )
  .output(
    z.object({
      resources: z.array(z.any()),
      total: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let org = ctx.input.organization || ctx.config.organization;
    if (!org)
      throw new Error('Organization is required. Set it in config or provide it as input.');

    let result = await client.searchResources(
      org,
      ctx.input.query,
      ctx.input.includeProperties
    );

    let resources = result.resources || [];

    return {
      output: {
        resources,
        total: result.total
      },
      message: `Found **${resources.length}** resource(s) matching query \`${ctx.input.query}\` in organization **${org}**`
    };
  })
  .build();
