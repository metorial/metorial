import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSchema = SlateTool.create(spec, {
  name: 'Get Schema',
  key: 'get_schema',
  description: `Retrieves the GraphQL schema for a federated graph. Can fetch either the composed federated schema or an individual subgraph's schema.

Use without a subgraph name to get the full composed schema. Specify a subgraph name to get that specific subgraph's SDL.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountSlug: z.string().describe('Account slug (personal or organization)'),
      graphSlug: z.string().describe('Graph slug'),
      branch: z.string().optional().describe('Branch name. Defaults to "main".'),
      subgraphName: z
        .string()
        .optional()
        .describe('Specific subgraph name. Omit to get the full composed federated schema.')
    })
  )
  .output(
    z.object({
      schema: z.string().nullable().describe('GraphQL SDL schema, or null if not found'),
      schemaType: z
        .enum(['federated', 'subgraph'])
        .describe('Whether this is the composed federated schema or a single subgraph schema')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let schema = await client.getSchema(
      ctx.input.accountSlug,
      ctx.input.graphSlug,
      ctx.input.branch,
      ctx.input.subgraphName
    );

    let schemaType = ctx.input.subgraphName ? ('subgraph' as const) : ('federated' as const);
    let branchLabel = ctx.input.branch || 'main';
    let label = ctx.input.subgraphName
      ? `subgraph **${ctx.input.subgraphName}**`
      : 'composed federated schema';

    return {
      output: {
        schema,
        schemaType
      },
      message: schema
        ? `Retrieved ${label} from branch **${branchLabel}** of ${ctx.input.accountSlug}/${ctx.input.graphSlug}.`
        : `No schema found for ${label} on branch **${branchLabel}**.`
    };
  })
  .build();
