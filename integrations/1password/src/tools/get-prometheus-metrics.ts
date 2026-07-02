import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { createConnectClient } from '../lib/connect-tool';
import { spec } from '../spec';

export let getPrometheusMetrics = SlateTool.create(spec, {
  name: 'Get Prometheus Metrics',
  key: 'get_prometheus_metrics',
  description: `Retrieve Prometheus metrics from the 1Password Connect server. Metrics text is returned as a Slate attachment with structured output limited to metadata.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      byteLength: z.number().describe('Byte length of the returned metrics attachment'),
      mimeType: z.string().describe('MIME type of the returned metrics attachment'),
      attachmentCount: z.number().describe('Number of attachments returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createConnectClient(ctx);

    ctx.progress('Fetching Prometheus metrics...');
    let metrics = await client.getPrometheusMetrics();

    return {
      output: {
        byteLength: metrics.byteLength,
        mimeType: metrics.contentType,
        attachmentCount: 1
      },
      attachments: [createTextAttachment(metrics.content, metrics.contentType)],
      message: `Retrieved Prometheus metrics as an attachment (${metrics.byteLength} bytes).`
    };
  })
  .build();
