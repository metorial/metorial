import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAiSearchTerms = SlateTool.create(spec, {
  name: 'Get AI Search Terms',
  key: 'get_ai_search_terms',
  description: `Retrieve all search terms tracked for an AI Visibility domain. Shows which queries are being monitored across AI search engines, along with their status, update interval, region, and execution timestamps.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      domainId: z.string().describe('AI Visibility domain ID to get search terms for')
    })
  )
  .output(
    z.object({
      searchTerms: z.array(z.any()).describe('List of tracked AI search terms')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listAiSearchTerms(ctx.input.domainId);
    let searchTerms = Array.isArray(data) ? data : (data?.search_terms ?? data?.data ?? []);

    return {
      output: { searchTerms },
      message: `Found **${searchTerms.length}** tracked AI search term(s).`
    };
  })
  .build();
