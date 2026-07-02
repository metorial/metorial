import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLanguages = SlateTool.create(spec, {
  name: 'List Languages',
  key: 'list_languages',
  description: `Retrieve the list of supported languages for a given search engine. Use the returned language codes as the "lang" parameter in SERP search tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchEngine: z
        .enum(['google', 'bing', 'yahoo'])
        .default('google')
        .describe('Search engine to get languages for')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      message: z.string().describe('Response message'),
      languages: z.array(z.any()).describe('List of supported languages')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.listLanguages({
      searchEngine: ctx.input.searchEngine
    });

    let languages = response?.results ?? [];

    return {
      output: {
        status: response?.status ?? 'unknown',
        message: response?.msg ?? '',
        languages: Array.isArray(languages) ? languages : []
      },
      message: `Retrieved **${Array.isArray(languages) ? languages.length : 0}** supported languages for ${ctx.input.searchEngine}.`
    };
  })
  .build();
