import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeProfile = SlateTool.create(spec, {
  name: 'Scrape Profile',
  key: 'scrape_profile',
  description: `Scrape professional profile data from a LinkedIn profile URL. Returns detailed information about the individual including name, job title, company, and profile summary. Supports both single and bulk scraping (up to 50 URLs).`,
  constraints: ['Maximum 50 profile URLs per request when using bulk mode.'],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      profileUrls: z.array(z.string()).describe('One or more LinkedIn profile URLs to scrape')
    })
  )
  .output(
    z.object({
      profiles: z.array(z.any()).describe('Array of scraped profile data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let profiles: any[];
    if (ctx.input.profileUrls.length === 1) {
      let result = await client.scrapeProfile(ctx.input.profileUrls[0]!);
      profiles = [result];
    } else {
      let result = await client.scrapeProfiles(ctx.input.profileUrls);
      profiles = Array.isArray(result) ? result : result?.data || [result];
    }

    return {
      output: { profiles },
      message: `Scraped **${profiles.length}** profile(s).`
    };
  })
  .build();
