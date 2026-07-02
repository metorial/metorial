import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let publishSubgraph = SlateTool.create(spec, {
  name: 'Publish Subgraph',
  key: 'publish_subgraph',
  description: `Publishes a subgraph schema to the Grafbase schema registry. When published, the registry composes the subgraph with all other subgraphs in the branch to create a unified federated schema.

Republishing an unchanged schema is safe and has no side effects. If composition fails, the federated graph continues running with the previous working schema.`,
  instructions: [
    'Use "Get Graph" to obtain the graph ID before publishing.',
    'Publish after each subgraph deployment to keep the registry in sync.',
    'Use "Check Subgraph Schema" first to validate changes before publishing.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      graphId: z.string().describe('ID of the federated graph'),
      subgraphName: z.string().describe('Identifier for the subgraph within the branch'),
      schema: z.string().describe('GraphQL SDL schema of the subgraph'),
      url: z.string().optional().describe('Endpoint URL where the subgraph runs'),
      branch: z
        .string()
        .optional()
        .describe('Target branch name. Defaults to the production branch.'),
      message: z.string().optional().describe('Commit message describing the change')
    })
  )
  .output(
    z.object({
      published: z.boolean().describe('Whether the subgraph was successfully published'),
      compositionErrors: z
        .array(z.string())
        .optional()
        .describe(
          'Composition errors if the schema could not be composed (the graph continues with the previous schema)'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let result = await client.publishSubgraph({
      graphId: ctx.input.graphId,
      name: ctx.input.subgraphName,
      schema: ctx.input.schema,
      url: ctx.input.url,
      branch: ctx.input.branch,
      message: ctx.input.message
    });

    let compositionErrors = result.compositionErrors || [];
    let hasErrors = compositionErrors.length > 0;

    return {
      output: {
        published: true,
        compositionErrors: hasErrors ? compositionErrors : undefined
      },
      message: hasErrors
        ? `Subgraph **${ctx.input.subgraphName}** was published but composition has ${compositionErrors.length} error(s). The federated graph continues using the previous working schema.`
        : `Subgraph **${ctx.input.subgraphName}** was published and composed successfully.`
    };
  })
  .build();
