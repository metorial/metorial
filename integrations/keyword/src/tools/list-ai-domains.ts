import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAiDomains = SlateTool.create(spec, {
  name: 'List AI Visibility Domains',
  key: 'list_ai_domains',
  description: `Retrieve all domains tracked by the AI Visibility Tracker. These are the domains monitored for brand visibility across AI search platforms like ChatGPT, Perplexity, AI Mode, and Gemini. Use this to discover tracked domains before querying metrics or search terms.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      domains: z.array(z.any()).describe('List of AI Visibility tracked domains')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.listAiDomains();
    let domains = Array.isArray(data) ? data : (data?.domains ?? data?.data ?? []);

    return {
      output: { domains },
      message: `Found **${domains.length}** AI Visibility tracked domain(s).`
    };
  })
  .build();
