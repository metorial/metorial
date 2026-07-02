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

export let updateSitemap = SlateTool.create(spec, {
  name: 'Update Sitemap',
  key: 'update_sitemap',
  description: `Update an existing sitemap's configuration including its name, start URLs, and selectors. The full sitemap definition must be provided.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      sitemapId: z.number().describe('The numeric ID of the sitemap to update'),
      sitemapName: z.string().describe('Name for the sitemap'),
      startUrls: z.array(z.string()).describe('One or more URLs where the scraper will begin'),
      selectors: z
        .array(selectorSchema)
        .describe('Array of selector definitions specifying what data to extract')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    await client.updateSitemap(ctx.input.sitemapId, {
      _id: ctx.input.sitemapName,
      startUrl: ctx.input.startUrls,
      selectors: ctx.input.selectors
    });

    return {
      output: {
        success: true
      },
      message: `Updated sitemap **${ctx.input.sitemapName}** (ID: \`${ctx.input.sitemapId}\`).`
    };
  })
  .build();
