import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let selectorSchema: z.ZodType<any> = z
  .object({
    id: z.string().describe('Unique identifier for the selector'),
    type: z
      .string()
      .describe(
        'Selector type: SelectorText, SelectorLink, SelectorImage, SelectorTable, SelectorHTML, SelectorElement, SelectorElementClick, SelectorPagination, SelectorElementAttribute, SelectorSitemapXmlLink'
      ),
    parentSelectors: z
      .array(z.string())
      .describe('Parent selector IDs. Use ["_root"] for top-level selectors'),
    selector: z.string().describe('CSS selector to target elements'),
    multiple: z.boolean().optional().describe('Whether to select multiple elements'),
    regex: z.string().optional().describe('Regular expression to apply to extracted text'),
    delay: z
      .union([z.string(), z.number()])
      .optional()
      .describe('Delay before extraction in milliseconds')
  })
  .passthrough();

export let createSitemap = SlateTool.create(spec, {
  name: 'Create Sitemap',
  key: 'create_sitemap',
  description: `Create a new sitemap that defines the structure and rules for scraping a website. A sitemap includes start URLs and a tree of CSS selectors that specify what data to extract from each page.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sitemapName: z
        .string()
        .describe('Name for the sitemap (used as the sitemap identifier)'),
      startUrls: z.array(z.string()).describe('One or more URLs where the scraper will begin'),
      selectors: z
        .array(selectorSchema)
        .describe('Array of selector definitions specifying what data to extract')
    })
  )
  .output(
    z.object({
      sitemapId: z.number().describe('The numeric ID of the created sitemap')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.createSitemap({
      _id: ctx.input.sitemapName,
      startUrl: ctx.input.startUrls,
      selectors: ctx.input.selectors
    });

    return {
      output: {
        sitemapId: result.id
      },
      message: `Created sitemap **${ctx.input.sitemapName}** with ID \`${result.id}\`.`
    };
  })
  .build();
