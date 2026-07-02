import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let designStatusUpdated = SlateTrigger.create(spec, {
  name: 'Design Status Updated',
  key: 'design_status_updated',
  description:
    'Triggered when the workflow/approval status of a design is updated (e.g., changed to APPROVED, REJECTED, etc.). Useful for integrating approval workflows into external systems. Webhooks must be configured in the Abyssale dashboard.'
})
  .input(
    z.object({
      designId: z.string().describe('Design UUID'),
      status: z.string().describe('New workflow status'),
      rawPayload: z.record(z.string(), z.any()).describe('Raw event payload')
    })
  )
  .output(
    z.object({
      designId: z.string().describe('UUID of the design whose status changed'),
      status: z.string().describe('New workflow/approval status (e.g., APPROVED, REJECTED)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      return {
        inputs: [
          {
            designId: data.template_id || data.design_id || data.id || '',
            status: data.status || '',
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'design_status.updated',
        id: `${ctx.input.designId}_${ctx.input.status}`,
        output: {
          designId: ctx.input.designId,
          status: ctx.input.status
        }
      };
    }
  })
  .build();
