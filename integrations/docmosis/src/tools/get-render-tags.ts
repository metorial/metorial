import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getRenderTags = SlateTool.create(spec, {
  name: 'Get Render Tags',
  key: 'get_render_tags',
  description: `Retrieve render usage statistics grouped by tags. Tags are user-defined labels applied to render requests for tracking and reporting purposes.
Returns monthly aggregated data showing document and page counts per tag.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      tags: z
        .string()
        .optional()
        .describe(
          'Semicolon-separated tags to query (e.g., "invoice;report"). Docmosis requires at least one tag.'
        )
    })
  )
  .output(
    z.object({
      succeeded: z.boolean().describe('Whether the operation succeeded'),
      renderTags: z
        .array(
          z.object({
            year: z.string().describe('Year of the usage period'),
            month: z.string().describe('Month of the usage period'),
            tags: z
              .array(
                z.object({
                  tagName: z.string().describe('Tag name'),
                  pageCount: z
                    .string()
                    .optional()
                    .describe('Number of pages rendered with this tag'),
                  documentCount: z
                    .string()
                    .optional()
                    .describe('Number of documents rendered with this tag')
                })
              )
              .describe('Tag statistics for this month')
          })
        )
        .describe('Monthly tag usage data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getRenderTags(ctx.input.tags);

    let renderTags = (result.renderTags || []).map(month => ({
      year: String(month.year),
      month: String(month.month),
      tags: (month.tags || []).map(tag => ({
        tagName: tag.name,
        pageCount: tag.countPages !== undefined ? String(tag.countPages) : undefined,
        documentCount:
          tag.countDocuments !== undefined ? String(tag.countDocuments) : undefined
      }))
    }));

    let filterInfo = ctx.input.tags ? ` for tags: ${ctx.input.tags}` : '';
    let message = result.succeeded
      ? `Retrieved render tag statistics${filterInfo}. Found data for **${renderTags.length}** month(s).`
      : `Failed to retrieve render tags: ${result.shortMsg || 'Unknown error'}`;

    return {
      output: {
        succeeded: result.succeeded,
        renderTags
      },
      message
    };
  })
  .build();
