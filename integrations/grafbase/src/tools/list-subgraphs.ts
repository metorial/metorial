import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listSubgraphs = SlateTool.create(spec, {
  name: 'List Subgraphs',
  key: 'list_subgraphs',
  description: `Lists all published subgraphs in a branch of a federated graph. Returns each subgraph's name, endpoint URL, and schema definition.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      accountSlug: z.string().describe('Account slug (personal or organization)'),
      graphSlug: z.string().describe('Graph slug'),
      branch: z.string().optional().describe('Branch name. Defaults to "main".')
    })
  )
  .output(
    z.object({
      subgraphs: z
        .array(
          z.object({
            name: z.string().describe('Subgraph identifier within the branch'),
            url: z.string().optional().describe('Endpoint URL where the subgraph runs'),
            schema: z.string().optional().describe('GraphQL SDL schema of the subgraph')
          })
        )
        .describe('Published subgraphs in the branch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let subgraphs = await client.listSubgraphs(
      ctx.input.accountSlug,
      ctx.input.graphSlug,
      ctx.input.branch
    );

    let mapped = subgraphs.map((s: any) => ({
      name: s.name,
      url: s.url,
      schema: s.schema
    }));

    let branchLabel = ctx.input.branch || 'main';
    return {
      output: {
        subgraphs: mapped
      },
      message: `Found **${mapped.length}** subgraph(s) on branch **${branchLabel}** of ${ctx.input.accountSlug}/${ctx.input.graphSlug}.`
    };
  })
  .build();
