import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTagSuggestions = SlateTool.create(spec, {
  name: 'Get Tag Suggestions',
  key: 'get_tag_suggestions',
  description: `Get tag suggestions for a given URL. Returns both popular tags (used site-wide by other users) and recommended tags (personalized based on your tagging history). Helpful for consistent and discoverable tagging.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      url: z.string().describe('URL to get tag suggestions for')
    })
  )
  .output(
    z.object({
      popular: z.array(z.string()).describe('Popular tags used site-wide for this URL'),
      recommended: z
        .array(z.string())
        .describe('Recommended tags based on your tagging history')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let suggestions = await client.getSuggestedTags(ctx.input.url);

    return {
      output: suggestions,
      message: `Found **${suggestions.popular.length}** popular and **${suggestions.recommended.length}** recommended tag(s) for ${ctx.input.url}.`
    };
  })
  .build();
