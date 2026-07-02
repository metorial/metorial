import { SlateTool } from 'slates';
import { z } from 'zod';
import { Api2PdfClient } from '../lib/client';
import { spec } from '../spec';

export let checkStatus = SlateTool.create(spec, {
  name: 'Check Status',
  key: 'check_status',
  description: `Check the API2PDF service health status endpoint. Use this to distinguish account or request issues from a broader API availability problem.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      status: z.string().describe('Current API2PDF service status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Api2PdfClient({
      token: ctx.auth.token,
      useXlCluster: ctx.config.useXlCluster
    });

    let result = await client.getStatus();

    return {
      output: {
        status: result.status
      },
      message: `API2PDF status: **${result.status}**`
    };
  })
  .build();
