import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getCollection } from '../lib/response';
import { spec } from '../spec';

export let listAiDomains = SlateTool.create(spec, {
  name: 'List AI Visibility Domains',
  key: 'list_ai_domains',
  description: `Retrieve all domains tracked by the AI Visibility Tracker. These are the domains monitored for brand visibility across AI search platforms like ChatGPT, Perplexity, AI Mode, and Gemini. Use this to discover tracked domains before querying metrics or search terms.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z
        .number()
        .optional()
        .describe('Page number. Follow pagination metadata to retrieve additional domains.')
    })
  )
  .output(
    z.object({
      domains: z.array(z.any()).describe('AI Visibility domains on the current page'),
      rawResponse: z.any().describe('Original response including pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listAiDomains(ctx.input.page);
    let domains = getCollection(data, 'domains');

    return {
      output: { domains, rawResponse: data },
      message: `Found **${domains.length}** AI Visibility domain(s) on this page.`
    };
  })
  .build();
