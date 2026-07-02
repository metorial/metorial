import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTopWebsites = SlateTool.create(spec, {
  name: 'Get Top Websites',
  key: 'get_top_websites',
  description: `Retrieve a list of the top-ranked websites globally, based on SimilarWeb's SimilarRank algorithm. Rankings are derived from unique visitors and page views across desktop and mobile web traffic.`,
  constraints: [
    'Maximum of 5,000 results per request.',
    'Default limit is 10 if not specified.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Number of top websites to return. Default is 10, maximum is 5,000.')
    })
  )
  .output(
    z.object({
      topSites: z
        .array(
          z.object({
            rank: z.number().describe('Global rank position of the website.'),
            domain: z.string().describe('Domain name of the ranked website.')
          })
        )
        .describe('List of top-ranked websites.'),
      count: z.number().describe('Number of websites returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getTopSites({
      limit: ctx.input.limit
    });

    return {
      output: {
        topSites: result.topSites,
        count: result.topSites.length
      },
      message: `Retrieved **${result.topSites.length}** top-ranked websites globally.`
    };
  })
  .build();
