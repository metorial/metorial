import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let reverseImageResultSchema = z
  .object({
    position: z.number().optional().describe('Position in results'),
    title: z.string().optional().describe('Page title'),
    url: z.string().optional().describe('URL of the page containing the image'),
    destination: z.string().optional().describe('Display URL breadcrumb'),
    description: z.string().optional().describe('Page description snippet'),
    isAmp: z.boolean().optional().describe('Whether the page is AMP-enabled')
  })
  .passthrough();

let reverseImageSearchResultSchema = z
  .object({
    query: z.record(z.string(), z.any()).optional().describe('Echo of query parameters'),
    organicResults: z
      .array(reverseImageResultSchema)
      .optional()
      .describe('Pages where the image appears')
  })
  .passthrough();

export let reverseImageSearch = SlateTool.create(spec, {
  name: 'Reverse Image Search',
  key: 'reverse_image_search',
  description: `Find where and how a specific image appears online using Google's reverse image search. Useful for brand monitoring, copyright compliance, and content tracking. The image must be publicly accessible via URL.`,
  instructions: [
    'The image must be publicly available through a URL.',
    'Use `start` for pagination to retrieve additional matches.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      imageUrl: z.string().describe('Publicly accessible URL of the image to search for'),
      numResults: z
        .number()
        .optional()
        .describe('Number of results to return (max 100 per page)'),
      start: z.number().optional().describe('Result offset for pagination')
    })
  )
  .output(reverseImageSearchResultSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.reverseImageSearch({
      imageUrl: ctx.input.imageUrl,
      num: ctx.input.numResults,
      start: ctx.input.start
    });

    let organicResults = results.organic ?? [];

    return {
      output: {
        ...results,
        organicResults
      },
      message: `Found **${organicResults.length}** pages matching the provided image.`
    };
  })
  .build();
