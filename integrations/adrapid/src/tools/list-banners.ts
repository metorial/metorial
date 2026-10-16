import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listBanners = SlateTool.create(spec, {
  name: 'List Banners',
  key: 'list_banners',
  description:
    'List and search banners accessible to the authenticated Adrapid user. Use returned banner IDs with Get Banner to check processing and download completed files.',
  instructions: [
    'Use offset and limit to retrieve subsequent pages. Adrapid requires a limit of at least 10.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      offset: z
        .number()
        .optional()
        .describe('Number of results to skip; a non-negative integer'),
      limit: z
        .number()
        .optional()
        .describe('Maximum results in this page; an integer of at least 10, defaults to 10'),
      search: z.string().optional().describe('Search string to filter banners'),
      status: z
        .enum(['exporting', 'ready', 'failed'])
        .optional()
        .describe('Filter by processing status')
    })
  )
  .output(
    z.object({
      banners: z
        .array(
          z.object({
            bannerId: z.string().describe('Unique banner identifier for Get Banner'),
            name: z.string().optional().describe('Banner name, when returned'),
            status: z
              .string()
              .optional()
              .describe('Provider processing status, when returned'),
            templateId: z.string().optional().describe('Editable template ID, when returned'),
            raw: z.record(z.string(), z.any()).describe('Complete provider banner list item')
          })
        )
        .describe('Banners in the current page'),
      count: z
        .number()
        .optional()
        .describe('Total matching banners reported by Adrapid, when returned'),
      raw: z.record(z.string(), z.any()).describe('Complete provider list response')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client({ token: ctx.auth.token }).listBanners(ctx.input);
    return {
      output: {
        banners: result.banners,
        count: result.count,
        raw: result.raw
      },
      message: `Retrieved **${result.banners.length}** banner(s) in this page.`
    };
  })
  .build();
