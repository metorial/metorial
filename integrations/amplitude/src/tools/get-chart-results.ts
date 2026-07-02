import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
import { spec } from '../spec';

export let getChartResultsTool = SlateTool.create(spec, {
  name: 'Get Chart Results',
  key: 'get_chart_results',
  description: `Fetch CSV results from a saved chart in Amplitude by its chart ID. The chart ID can be found in the URL when viewing a chart. The CSV content is returned as a Slate attachment.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      chartId: z
        .string()
        .describe('The ID of the saved chart to fetch results for. Found in the chart URL.')
    })
  )
  .output(
    z.object({
      contentType: z.string().describe('MIME type of the exported chart attachment.'),
      byteLength: z.number().describe('Size of the exported chart CSV in bytes.'),
      attachmentCount: z.number().describe('Number of attachments returned.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AmplitudeClient({
      apiKey: ctx.auth.apiKey,
      secretKey: ctx.auth.secretKey,
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getChartResults(ctx.input.chartId);

    return {
      output: {
        contentType: result.contentType,
        byteLength: result.byteLength,
        attachmentCount: 1
      },
      attachments: [createTextAttachment(result.content, result.contentType)],
      message: `Retrieved CSV results for chart **${ctx.input.chartId}** as an attachment.`
    };
  })
  .build();
