import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlacidClient } from '../lib/client';
import { spec } from '../spec';

export let getGenerationStatus = SlateTool.create(spec, {
  name: 'Get Generation Status',
  key: 'get_generation_status',
  description: `Check the status of a previously queued image, PDF, or video generation. Returns the current status and the output URL when generation is complete.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      generationType: z
        .enum(['image', 'pdf', 'video'])
        .describe('Type of generation to check'),
      generationId: z.number().describe('ID of the generation to check')
    })
  )
  .output(
    z.object({
      generationId: z.number().describe('ID of the generation'),
      status: z.string().describe('Current status: queued, finished, or error'),
      outputUrl: z
        .string()
        .nullable()
        .describe('URL of the generated file (null if not yet finished)'),
      pollingUrl: z.string().describe('URL for continued polling')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlacidClient({ token: ctx.auth.token });

    let status: string;
    let outputUrl: string | null;
    let pollingUrl: string;

    switch (ctx.input.generationType) {
      case 'image': {
        let result = await client.getImage(ctx.input.generationId);
        status = result.status;
        outputUrl = result.image_url;
        pollingUrl = result.polling_url;
        break;
      }
      case 'pdf': {
        let result = await client.getPdf(ctx.input.generationId);
        status = result.status;
        outputUrl = result.pdf_url;
        pollingUrl = result.polling_url;
        break;
      }
      case 'video': {
        let result = await client.getVideo(ctx.input.generationId);
        status = result.status;
        outputUrl = result.video_url;
        pollingUrl = result.polling_url;
        break;
      }
    }

    return {
      output: {
        generationId: ctx.input.generationId,
        status,
        outputUrl,
        pollingUrl
      },
      message:
        status === 'finished'
          ? `${ctx.input.generationType} **#${ctx.input.generationId}** is **finished**. [View output](${outputUrl})`
          : `${ctx.input.generationType} **#${ctx.input.generationId}** status: **${status}**.`
    };
  })
  .build();
