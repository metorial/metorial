import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getProblematicUrls = SlateTool.create(spec, {
  name: 'Get Problematic URLs',
  key: 'get_problematic_urls',
  description: `Retrieve URLs that encountered problems during a scraping job, including empty pages, failed requests, and pages with no extracted values.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      scrapingJobId: z.number().describe('ID of the scraping job'),
      page: z.number().optional().describe('Page number for pagination (starts at 1)')
    })
  )
  .output(
    z.object({
      problematicUrls: z.array(
        z.object({
          url: z.string().describe('The problematic URL'),
          problemType: z.string().describe('Type of problem: "empty", "failed", or "no_value"')
        })
      ),
      currentPage: z.number().describe('Current page number'),
      lastPage: z.number().describe('Last page number'),
      total: z.number().describe('Total number of problematic URLs'),
      perPage: z.number().describe('URLs per page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.getProblematicUrls(ctx.input.scrapingJobId, {
      page: ctx.input.page
    });

    return {
      output: {
        problematicUrls: result.urls.map((u: any) => ({
          url: u.url,
          problemType: u.type
        })),
        currentPage: result.currentPage,
        lastPage: result.lastPage,
        total: result.total,
        perPage: result.perPage
      },
      message: `Found **${result.total}** problematic URLs for job \`${ctx.input.scrapingJobId}\` (page ${result.currentPage}/${result.lastPage}).`
    };
  })
  .build();
