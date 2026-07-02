import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listProposals = SlateTool.create(spec, {
  name: 'List Proposals',
  key: 'list_proposals',
  description: `Retrieves proposals from Better Proposals. Can list all proposals or filter by status: **new**, **opened**, **sent**, **signed**, or **paid**. Supports pagination for large result sets.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      status: z
        .enum(['all', 'new', 'opened', 'sent', 'signed', 'paid'])
        .optional()
        .default('all')
        .describe('Filter proposals by status. Defaults to all proposals.'),
      page: z
        .number()
        .optional()
        .describe('Page number for pagination. Increment until an empty list is returned.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API'),
      proposals: z.array(z.any()).describe('List of proposals matching the filter criteria')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    if (ctx.input.status && ctx.input.status !== 'all') {
      result = await client.listProposalsByStatus(ctx.input.status, ctx.input.page);
    } else {
      result = await client.listProposals(ctx.input.page);
    }

    let proposals = Array.isArray(result.data)
      ? result.data
      : result.data
        ? [result.data]
        : [];

    return {
      output: {
        status: result.status ?? 'success',
        proposals
      },
      message: `Retrieved ${proposals.length} proposal(s)${ctx.input.status !== 'all' ? ` with status "${ctx.input.status}"` : ''}.`
    };
  })
  .build();
