import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, scraperRunSchema } from '../lib/client';
import { cookieSchema } from '../lib/schemas';
import { spec } from '../spec';

export let runScraperAsyncTool = SlateTool.create(spec, {
  name: 'Run Scraper Asynchronously',
  key: 'run_scraper_async',
  description:
    'Start a reusable scraper run and return immediately with its run_id. Use get_scraper_run to retrieve progress and extracted data.',
  instructions: [
    'Call list_scrapers to select a scraper, then get_scraper to inspect its configuration and parameters_schema.',
    'Agentic scrapers accept one URL per run. Extractor scrapers accept up to 100 URLs.',
    'Omit urls to use the scraper’s default URL, or provide named parameters for an agentic scraper.'
  ],
  constraints: [
    'Proxy routing and cookies apply to extractor scrapers; Parsera ignores them for agentic scrapers.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({
      scraperId: z.string().describe('Scraper ID from list_scrapers or create_scraper'),
      urls: z
        .array(z.string())
        .optional()
        .describe(
          'Target URLs. Extractor scrapers support up to 100; agentic scrapers support one. Omit to use the default URL.'
        ),
      parameters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Named inputs required by an agentic scraper’s parameters_schema from get_scraper'
        ),
      callbackUrl: z
        .string()
        .optional()
        .describe('Optional URL where Parsera POSTs results when the run completes'),
      proxyCountry: z
        .string()
        .optional()
        .describe('Proxy country for extractor scrapers, such as Germany'),
      cookies: z
        .array(cookieSchema)
        .optional()
        .describe('Cookies for extractor scraper requests')
    })
  )
  .output(
    z.object({
      run: scraperRunSchema.describe(
        'Provider dispatch response with run_id and status. Pass run_id to get_scraper_run.'
      )
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.urls && (ctx.input.urls.length === 0 || ctx.input.urls.length > 100)) {
      throw createApiServiceError(
        'Provide between 1 and 100 URLs, or omit urls to use the scraper’s default URL.'
      );
    }
    let client = new Client({ token: ctx.auth.token });
    let run = await client.runScraperAsync(ctx.input);
    return {
      output: { run },
      message: `Started scraper run **${run.run_id}** (${run.status})`
    };
  })
  .build();
