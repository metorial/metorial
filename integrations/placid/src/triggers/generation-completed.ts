import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let generationCompleted = SlateTrigger.create(spec, {
  name: 'Generation Completed',
  key: 'generation_completed',
  description:
    'Triggers when an image, PDF, or video generation completes. Set the provided webhook URL as the webhook_success parameter in your Placid generation requests.'
})
  .input(
    z.object({
      generationId: z.number().describe('ID of the completed generation'),
      generationType: z.string().describe('Type of generation (image, pdf, video)'),
      status: z.string().describe('Generation status'),
      outputUrl: z.string().nullable().describe('URL of the generated file'),
      passthrough: z
        .string()
        .nullable()
        .describe('Custom passthrough data from the original request'),
      rawPayload: z.record(z.string(), z.unknown()).describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      generationId: z.number().describe('ID of the completed generation'),
      status: z.string().describe('Generation status (finished or error)'),
      outputUrl: z.string().nullable().describe('URL of the generated file'),
      passthrough: z
        .string()
        .nullable()
        .describe('Custom passthrough data from the original request')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      // Determine the generation type from the response payload
      let generationType = 'unknown';
      let outputUrl: string | null = null;

      if ('image_url' in data) {
        generationType = 'image';
        outputUrl = (data.image_url as string) ?? null;
      } else if ('pdf_url' in data) {
        generationType = 'pdf';
        outputUrl = (data.pdf_url as string) ?? null;
      } else if ('video_url' in data) {
        generationType = 'video';
        outputUrl = (data.video_url as string) ?? null;
      }

      let generationId = (data.id as number) ?? 0;
      let status = (data.status as string) ?? 'finished';
      let passthrough = (data.passthrough as string) ?? null;

      return {
        inputs: [
          {
            generationId,
            generationType,
            status,
            outputUrl,
            passthrough,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `generation.${ctx.input.status}`,
        id: `${ctx.input.generationType}-${ctx.input.generationId}`,
        output: {
          generationId: ctx.input.generationId,
          status: ctx.input.status,
          outputUrl: ctx.input.outputUrl,
          passthrough: ctx.input.passthrough
        }
      };
    }
  })
  .build();
