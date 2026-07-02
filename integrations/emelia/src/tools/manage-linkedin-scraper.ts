import { SlateTool } from 'slates';
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
- **split**: Split a scraper into multiple parts.
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
      parts: z.number().optional().describe('Number of parts to split into (for split)')
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
    let { action, scraperId, name, url, linkedInAuthId, parts } = ctx.input;

    if (action === 'list') {
      let scrapers = await client.listLinkedInScrapers();
      let scraperList = Array.isArray(scrapers) ? scrapers : [];
      return {
        output: { scrapers: scraperList, success: true },
        message: `Retrieved **${scraperList.length}** LinkedIn scraper(s).`
      };
    }

    if (action === 'create') {
      if (!name) throw new Error('Name is required');
      if (!url) throw new Error('Sales Navigator search URL is required');
      let scraper = await client.createLinkedInScraper({ name, url, linkedInAuthId });
      return {
        output: { scraper, success: true },
        message: `Created LinkedIn scraper **${name}**.`
      };
    }

    if (!scraperId) throw new Error('Scraper ID is required for this action');

    if (action === 'delete') {
      await client.deleteLinkedInScraper(scraperId);
      return {
        output: { success: true },
        message: `Deleted LinkedIn scraper **${scraperId}**.`
      };
    }

    if (action === 'rename') {
      if (!name) throw new Error('New name is required');
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
      let downloadData = await client.downloadScraperData(scraperId);
      return {
        output: { downloadData, success: true },
        message: `Downloaded data from scraper **${scraperId}**.`
      };
    }

    if (action === 'split') {
      if (!parts) throw new Error('Number of parts is required');
      await client.splitLinkedInScraper(scraperId, { parts });
      return {
        output: { success: true },
        message: `Split scraper **${scraperId}** into **${parts}** parts.`
      };
    }

    if (action === 'start_enrichment') {
      await client.startScraperEnrichment(scraperId);
      return {
        output: { success: true },
        message: `Started enrichment for scraper **${scraperId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
