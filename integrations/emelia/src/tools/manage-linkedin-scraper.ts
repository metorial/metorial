import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let manageLinkedInScraper = SlateTool.create(spec, {
  name: 'Manage LinkedIn Scraper',
  key: 'manage_linkedin_scraper',
  description: `Create and manage LinkedIn Sales Navigator scrapers to extract contact data at scale.
- **list**: List all scrapers.
- **create**: Create a new scraper from a Sales Navigator search URL.
- **delete**: Delete a scraper.
- **rename**: Rename a scraper.
- **pause**: Pause a running scraper.
- **resume**: Resume a paused scraper.
- **download**: Download scraped data.
- **split**: Detach contacts already extracted from a segmented scraper. The provider determines the split; parts is retained for compatibility.
- **start_enrichment**: Start email/phone enrichment on scraped data.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'create',
          'delete',
          'rename',
          'pause',
          'resume',
          'download',
          'split',
          'start_enrichment'
        ])
        .describe('Operation to perform'),
      scraperId: z
        .string()
        .optional()
        .describe('Scraper ID (required for most actions except list and create)'),
      name: z.string().optional().describe('Scraper name (required for create, rename)'),
      url: z
        .string()
        .optional()
        .describe('LinkedIn Sales Navigator search URL (required for create)'),
      linkedInAuthId: z.string().optional().describe('LinkedIn auth config ID (for create)'),
      parts: z
        .number()
        .optional()
        .describe(
          'Legacy input retained for compatibility; the provider determines the split'
        ),
      format: z
        .number()
        .int()
        .min(1)
        .max(3)
        .optional()
        .default(3)
        .describe('Download format: 1 with emails, 2 without emails, 3 all contacts'),
      country: z
        .string()
        .optional()
        .describe('ISO country code required for start_enrichment, for example US or FR')
    })
  )
  .output(
    z.object({
      scrapers: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of scrapers'),
      scraper: z.record(z.string(), z.unknown()).optional().describe('Scraper details'),
      downloadData: z.unknown().optional().describe('Downloaded scraper data'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    let { action, scraperId, name, url, linkedInAuthId } = ctx.input;

    if (action === 'list') {
      let scrapers = await client.listLinkedInScrapers();
      let scraperList = Array.isArray(scrapers) ? scrapers : [];
      return {
        output: { scrapers: scraperList, success: true },
        message: `Retrieved **${scraperList.length}** LinkedIn scraper(s).`
      };
    }

    if (action === 'create') {
      if (!name) throw createApiServiceError('Name is required');
      if (!url) throw createApiServiceError('Sales Navigator search URL is required');
      let scraper = await client.createLinkedInScraper({ name, url, linkedInAuthId });
      return {
        output: { scraper, success: true },
        message: `Created LinkedIn scraper **${name}**.`
      };
    }

    if (!scraperId) throw createApiServiceError('Scraper ID is required for this action');

    if (action === 'delete') {
      await client.deleteLinkedInScraper(scraperId);
      return {
        output: { success: true },
        message: `Deleted LinkedIn scraper **${scraperId}**.`
      };
    }

    if (action === 'rename') {
      if (!name) throw createApiServiceError('New name is required');
      await client.renameLinkedInScraper(scraperId, name);
      return {
        output: { success: true },
        message: `Renamed scraper **${scraperId}** to **${name}**.`
      };
    }

    if (action === 'pause') {
      await client.pauseLinkedInScraper(scraperId);
      return {
        output: { success: true },
        message: `Paused scraper **${scraperId}**.`
      };
    }

    if (action === 'resume') {
      await client.resumeLinkedInScraper(scraperId);
      return {
        output: { success: true },
        message: `Resumed scraper **${scraperId}**.`
      };
    }

    if (action === 'download') {
      let result = await client.downloadScraperData(scraperId, ctx.input.format);
      if (typeof result?.data !== 'string')
        throw createApiServiceError('Emelia did not return CSV content.');
      await ctx.addAttachment({
        type: 'content',
        content: new Response(result.data, {
          headers: { 'content-type': 'text/csv; charset=utf-8' }
        }),
        filename: `scraper-${scraperId.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`
      });
      return {
        output: { downloadData: result, success: true },
        message: `Downloaded data from scraper **${scraperId}**.`
      };
    }

    if (action === 'split') {
      await client.splitLinkedInScraper(scraperId);
      return {
        output: { success: true },
        message: `Detached the collected contacts from scraper **${scraperId}**.`
      };
    }

    if (action === 'start_enrichment') {
      if (!ctx.input.country)
        throw createApiServiceError('Country code is required to enrich scraper contacts.');
      await client.startScraperEnrichment(scraperId, ctx.input.country);
      return {
        output: { success: true },
        message: `Started enrichment for scraper **${scraperId}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
