import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let listSigners = SlateTool.create(spec, {
  name: 'List Signers',
  key: 'list_signers',
  description: `Retrieve a paginated list of signers, optionally filtered by a search query. Use this to browse or search for existing signers in your application.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filter: z.string().optional().describe('Search filter text to narrow results'),
      page: z.number().optional().describe('Page number for pagination (0-based)')
    })
  )
  .output(
    z.object({
      signers: z.array(z.any()).describe('List of signers'),
      totalCount: z.number().optional().describe('Total number of signers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.config.appId,
      appEnv: ctx.config.appEnv
    });

    let result: any;

    if (ctx.input.filter) {
      result = await client.searchSigners(ctx.input.filter);
    } else {
      result = await client.paginateSigners(ctx.input.page);
    }

    let signers = Array.isArray(result) ? result : result.signers || result.items || [];
    let totalCount = result.total || result.totalCount;

    return {
      output: {
        signers,
        totalCount
      },
      message: `Found **${signers.length}** signer(s)${totalCount ? ` out of ${totalCount} total` : ''}${ctx.input.filter ? ` matching "${ctx.input.filter}"` : ''}.`
    };
  })
  .build();
