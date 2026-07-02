import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let youtubeSearch = SlateTool.create(spec, {
  name: 'YouTube Search',
  key: 'youtube_search',
  description: `Extract YouTube search results in real-time. Returns video titles, URLs, channels, view counts, and other metadata. Configurable by country and language.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z.string().describe('The YouTube search query'),
      country: z
        .string()
        .optional()
        .describe('Country code in ISO 3166 Alpha-2 format. Defaults to "us".'),
      language: z.string().optional().describe('Language of results. Defaults to "en_us".'),
      filterParam: z
        .string()
        .optional()
        .describe('YouTube sp parameter for pagination and filtering')
    })
  )
  .output(
    z.object({
      results: z.any().describe('YouTube search results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.youtubeSearch({
      q: ctx.input.query,
      gl: ctx.input.country,
      hl: ctx.input.language,
      sp: ctx.input.filterParam
    });

    return {
      output: { results: data },
      message: `Searched YouTube for **"${ctx.input.query}"**.`
    };
  })
  .build();
