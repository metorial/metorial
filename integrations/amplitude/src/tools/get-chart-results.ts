import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { createAmplitudeClient } from '../lib/client';
import { spec } from '../spec';

export let getChartResultsTool = SlateTool.create(spec, {
  name: 'Get Chart Results',
  key: 'get_chart_results',
  description: `Download results from a saved Amplitude chart by its chart ID. The chart ID is in the chart URL. Returns a downloadable file; it does not render or edit the chart.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .authMethods(['api_key_secret'])
  .input(
    z.object({
      chartId: z
        .string()
        .describe('The ID of the saved chart to fetch results for. Found in the chart URL.')
    })
  )
  .output(
    z.object({
      contentType: z.string().describe('MIME type of the exported chart file.'),
      byteLength: z.number().describe('Size of the exported chart file in bytes.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createAmplitudeClient(ctx);

    let result = await client.getChartResults(ctx.input.chartId);

    return {
      output: {
        contentType: result.contentType,
        byteLength: result.byteLength
      },
      attachments: [createTextAttachment(result.content, result.contentType)],
      message: `Downloaded results for chart **${ctx.input.chartId}**.`
    };
  })
  .build();
