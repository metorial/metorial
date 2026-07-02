import { SlateTool } from 'slates';
import { z } from 'zod';
import { AmplitudeClient } from '../lib/client';
import { spec } from '../spec';

export let getChartResultsTool = SlateTool.create(spec, {
  name: 'Get Chart Results',
  key: 'get_chart_results',
  description: `Fetch results from a saved chart in Amplitude by its chart ID. Returns the same data that the chart displays in the Amplitude dashboard. The chart ID can be found in the URL when viewing a chart.`,
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
      chartData: z.any().describe('Full chart data including series, labels, and metadata.')
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
      output: { chartData: result.data ?? result },
      message: `Retrieved results for chart **${ctx.input.chartId}**.`
    };
  })
  .build();
