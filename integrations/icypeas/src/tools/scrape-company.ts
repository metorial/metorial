import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scrapeCompany = SlateTool.create(spec, {
  name: 'Scrape Company',
  key: 'scrape_company',
  description: `Scrape company profile data from LinkedIn company profile URLs. Returns company details such as name, description, industry, location, and employee count. Supports both single and bulk scraping (up to 50 URLs).`,
  constraints: ['Maximum 50 company URLs per request when using bulk mode.'],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      companyUrls: z
        .array(z.string())
        .describe('One or more LinkedIn company profile URLs to scrape')
    })
  )
  .output(
    z.object({
      companies: z.array(z.any()).describe('Array of scraped company data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let companies: any[];
    if (ctx.input.companyUrls.length === 1) {
      let result = await client.scrapeCompany(ctx.input.companyUrls[0]!);
      companies = [result];
    } else {
      let result = await client.scrapeCompanies(ctx.input.companyUrls);
      companies = Array.isArray(result) ? result : result?.data || [result];
    }

    return {
      output: { companies },
      message: `Scraped **${companies.length}** company profile(s).`
    };
  })
  .build();
