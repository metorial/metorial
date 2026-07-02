import { SlateTool } from 'slates';
import { z } from 'zod';
import { MozClient } from '../lib/client';
import { spec } from '../spec';

export let getSearchIntentTool = SlateTool.create(spec, {
  name: 'Get Search Intent',
  key: 'get_search_intent',
  description: `Analyze the search intent behind a keyword. Classifies the keyword into intent categories (navigational, informational, commercial, transactional) to help understand what users are looking for when searching for that term.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      keyword: z.string().describe('Keyword to analyze search intent for'),
      locale: z.string().optional().describe('Locale code (default: en-US)'),
      device: z
        .enum(['desktop', 'mobile'])
        .optional()
        .describe('Device type (default: desktop)'),
      engine: z.enum(['google', 'bing']).optional().describe('Search engine (default: google)')
    })
  )
  .output(
    z
      .object({
        keyword: z.string().describe('The analyzed keyword'),
        intent: z.any().optional().describe('Search intent classification data')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new MozClient({ token: ctx.auth.token });

    let result = await client.getSearchIntent({
      keyword: ctx.input.keyword,
      locale: ctx.input.locale,
      device: ctx.input.device,
      engine: ctx.input.engine
    });

    return {
      output: {
        keyword: result?.serp_query?.keyword || ctx.input.keyword,
        intent: result?.search_intent || result
      },
      message: `Analyzed search intent for "${ctx.input.keyword}".`
    };
  })
  .build();
