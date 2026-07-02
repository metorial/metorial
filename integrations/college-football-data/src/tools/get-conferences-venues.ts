import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getConferencesVenues = SlateTool.create(spec, {
  name: 'Get Conferences & Venues',
  key: 'get_conferences_venues',
  description: `Retrieve conference listings and/or venue/stadium information. Conference data includes names, abbreviations, and classification levels. Venue data includes location, capacity, and other facility details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeConferences: z
        .boolean()
        .optional()
        .default(true)
        .describe('Include conference listings'),
      includeVenues: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include venue/stadium listings')
    })
  )
  .output(
    z.object({
      conferences: z.array(z.any()).optional().describe('Conference listings'),
      venues: z.array(z.any()).optional().describe('Venue/stadium listings')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let results: any = {};

    if (ctx.input.includeConferences) {
      results.conferences = await client.getConferences();
    }

    if (ctx.input.includeVenues) {
      results.venues = await client.getVenues();
    }

    let parts: string[] = [];
    if (results.conferences)
      parts.push(
        `${Array.isArray(results.conferences) ? results.conferences.length : 0} conference(s)`
      );
    if (results.venues)
      parts.push(`${Array.isArray(results.venues) ? results.venues.length : 0} venue(s)`);

    return {
      output: results,
      message: `Retrieved ${parts.join(' and ')}.`
    };
  })
  .build();
