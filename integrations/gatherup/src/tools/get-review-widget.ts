import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getReviewWidget = SlateTool.create(spec, {
  name: 'Get Review Widget',
  key: 'get_review_widget',
  description: `Retrieve embeddable HTML for a reviews widget that displays customer reviews on a website. Supports Schema.org markup for SEO and can generate either a full widget or a compact badge.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      businessId: z.string().describe('Business ID (supports comma-separated multiple IDs)'),
      widgetType: z
        .enum(['widget', 'badge'])
        .optional()
        .describe('Widget format: full "widget" or compact "badge" (defaults to widget)'),
      includeSchemaOrg: z
        .boolean()
        .optional()
        .describe('Include Schema.org structured data markup (defaults to true)'),
      includeStyles: z
        .boolean()
        .optional()
        .describe('Include CSS styles in the output (defaults to false)')
    })
  )
  .output(
    z.object({
      widgetHTML: z.string().describe('Embeddable HTML code for the reviews widget')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let data = await client.getWidgetHtml({
      businessId: ctx.input.businessId,
      widgetType: ctx.input.widgetType,
      includeSchemaOrg: ctx.input.includeSchemaOrg === false ? 0 : 1,
      fullVersion: ctx.input.includeStyles ? 1 : 0
    });

    if (typeof data.widgetHTML !== 'string') {
      throw createApiServiceError('GatherUp did not return widget HTML.');
    }
    await ctx.addAttachment({
      type: 'content',
      content: new Response(data.widgetHTML, {
        headers: { 'content-type': 'text/html; charset=utf-8' }
      }),
      filename: 'gatherup-review-widget.html'
    });

    return {
      output: {
        widgetHTML: data.widgetHTML
      },
      message: `Retrieved ${ctx.input.widgetType ?? 'widget'} HTML for business **${ctx.input.businessId}**.`
    };
  })
  .build();
