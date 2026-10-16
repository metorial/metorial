import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { getCollection } from '../lib/response';
import { spec } from '../spec';

export let getKeywordCompetitors = SlateTool.create(spec, {
  name: 'Get Keyword Competitors',
  key: 'get_keyword_competitors',
  description:
    'Retrieve daily competitor SERP results for a tracked keyword over a date range. Includes ranking URLs and titles. Call list_keywords to discover keyword IDs.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      projectName: z.string().describe('Project name from list_projects'),
      keywordId: z.string().describe('Keyword ID from list_keywords'),
      startDate: z.string().describe('Inclusive start date in YYYY-MM-DD format'),
      endDate: z
        .string()
        .describe('Inclusive end date in YYYY-MM-DD format, on or after startDate')
    })
  )
  .output(z.object({ competitors: z.array(z.any()), rawResponse: z.any() }))
  .handleInvocation(async ctx => {
    let response = await new Client({ token: ctx.auth.token }).getKeywordCompetitors(
      ctx.input
    );
    return {
      message: 'Retrieved competitor SERP history.',
      output: { competitors: getCollection(response, 'competitors'), rawResponse: response }
    };
  })
  .build();
