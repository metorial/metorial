import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlidesClient } from '../lib/client';
import { googleSlidesActionScopes } from '../scopes';
import { spec } from '../spec';

export let embedSheetsChart = SlateTool.create(spec, {
  name: 'Embed Sheets Chart',
  key: 'embed_sheets_chart',
  description: `Embed a chart from a Google Sheets spreadsheet into a slide, or refresh an existing linked chart to reflect updated spreadsheet data. Requires Spreadsheets scope for creating or refreshing linked charts.`,
  instructions: [
    'To find the chartId, open the Google Sheets spreadsheet and look at the chart. The chart ID is a numeric identifier.',
    'Linked charts can be refreshed to show updated data using the refresh action.'
  ],
  constraints: [
    'Requires the spreadsheets.readonly or spreadsheets scope to create or refresh linked charts.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(googleSlidesActionScopes.embedSheetsChart)
  .input(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      action: z
        .enum(['embed', 'refresh'])
        .describe('Embed a new chart or refresh an existing one'),

      spreadsheetId: z
        .string()
        .optional()
        .describe('ID of the Google Sheets spreadsheet (for embed action)'),
      chartId: z
        .number()
        .optional()
        .describe('Numeric ID of the chart in the spreadsheet (for embed action)'),
      slideObjectId: z
        .string()
        .optional()
        .describe('Object ID of the slide to place the chart on (for embed action)'),
      widthPt: z
        .number()
        .optional()
        .describe('Width of the chart in points (for embed action)'),
      heightPt: z
        .number()
        .optional()
        .describe('Height of the chart in points (for embed action)'),
      linkingMode: z
        .enum(['LINKED', 'NOT_LINKED_IMAGE'])
        .optional()
        .describe(
          'Whether the chart stays linked to the spreadsheet (for embed action, defaults to LINKED)'
        ),

      chartObjectId: z
        .string()
        .optional()
        .describe('Object ID of the existing chart element to refresh (for refresh action)')
    })
  )
  .output(
    z.object({
      presentationId: z.string().describe('ID of the presentation'),
      action: z.string().describe('Action performed'),
      chartObjectId: z.string().optional().describe('Object ID of the chart element'),
      replies: z.array(z.any()).optional().describe('Raw API replies')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SlidesClient(ctx.auth.token);
    let { presentationId, action } = ctx.input;
    let result: any;
    let chartObjectId: string | undefined;

    if (action === 'embed') {
      if (
        !ctx.input.spreadsheetId ||
        ctx.input.chartId === undefined ||
        !ctx.input.slideObjectId
      ) {
        throw new Error(
          'spreadsheetId, chartId, and slideObjectId are required for embed action'
        );
      }

      result = await client.createSheetsChart(presentationId, {
        spreadsheetId: ctx.input.spreadsheetId,
        chartId: ctx.input.chartId,
        pageObjectId: ctx.input.slideObjectId,
        size:
          ctx.input.widthPt && ctx.input.heightPt
            ? { width: ctx.input.widthPt, height: ctx.input.heightPt }
            : undefined,
        linkingMode: ctx.input.linkingMode
      });

      chartObjectId = result.replies?.[0]?.createSheetsChart?.objectId;
    } else {
      if (!ctx.input.chartObjectId) {
        throw new Error('chartObjectId is required for refresh action');
      }

      result = await client.refreshSheetsChart(presentationId, ctx.input.chartObjectId);
      chartObjectId = ctx.input.chartObjectId;
    }

    let message =
      action === 'embed'
        ? `Embedded chart from spreadsheet \`${ctx.input.spreadsheetId}\` onto slide \`${ctx.input.slideObjectId}\`${chartObjectId ? ` as element \`${chartObjectId}\`` : ''}.`
        : `Refreshed linked chart \`${chartObjectId}\`.`;

    return {
      output: {
        presentationId,
        action,
        chartObjectId,
        replies: result?.replies
      },
      message
    };
  })
  .build();
