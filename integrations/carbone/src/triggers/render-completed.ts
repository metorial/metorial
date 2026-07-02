import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let renderCompleted = SlateTrigger.create(spec, {
  name: 'Render Completed',
  key: 'render_completed',
  description:
    'Triggered when an asynchronous document render is completed. To use this trigger, set the webhook URL provided by Slates as the carbone-webhook-url header when calling the Render Document tool.'
})
  .input(
    z.object({
      renderId: z.string().describe('Render ID of the completed document.'),
      success: z.boolean().describe('Whether the rendering was successful.')
    })
  )
  .output(
    z.object({
      renderId: z
        .string()
        .describe('Render ID of the generated document. Use this to download the document.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let renderId = body?.data?.renderId ?? body?.renderId ?? '';
      let success = body?.success ?? true;

      if (!renderId) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            renderId,
            success
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'render.completed',
        id: ctx.input.renderId,
        output: {
          renderId: ctx.input.renderId
        }
      };
    }
  })
  .build();
