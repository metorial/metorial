import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listConversions = SlateTool.create(spec, {
  name: 'List Conversions',
  key: 'list_conversions',
  description: `Retrieves all available conversion types and their configurable options. Use this to discover what conversions are supported and what parameters each conversion type accepts.

Each conversion type includes a type identifier (e.g. \`convert.pdf_to_word\`) and a list of options such as delimiter, quality, page orientation, etc.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      filterCategory: z
        .string()
        .optional()
        .describe(
          'Optional keyword to filter conversion types (e.g. "pdf", "image", "audio", "csv", "website", "ai", "ocr")'
        )
    })
  )
  .output(
    z.object({
      conversions: z
        .array(
          z.object({
            conversionType: z
              .string()
              .describe('The conversion type identifier to use when creating a task'),
            title: z.string().describe('Human-readable name of the conversion'),
            options: z
              .array(z.record(z.string(), z.unknown()))
              .describe('Available configuration options for this conversion type')
          })
        )
        .describe('List of available conversion types'),
      totalCount: z.number().describe('Number of conversions returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let config = await client.getConversions();

    let conversions = config.conversions.map(c => ({
      conversionType: c.type,
      title: c.title,
      options: c.options
    }));

    if (ctx.input.filterCategory) {
      let keyword = ctx.input.filterCategory.toLowerCase();
      conversions = conversions.filter(
        c =>
          c.conversionType.toLowerCase().includes(keyword) ||
          c.title.toLowerCase().includes(keyword)
      );
    }

    return {
      output: {
        conversions,
        totalCount: conversions.length
      },
      message: `Found **${conversions.length}** available conversion type(s)${ctx.input.filterCategory ? ` matching "${ctx.input.filterCategory}"` : ''}.`
    };
  })
  .build();
