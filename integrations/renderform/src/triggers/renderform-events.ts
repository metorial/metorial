import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let renderformEvents = SlateTrigger.create(spec, {
  name: 'RenderForm Events',
  key: 'renderform_events',
  description:
    'Triggers when a render completes or a template is created, updated, or deleted.'
})
  .input(
    z.object({
      action: z
        .enum(['RENDER_COMPLETE', 'TEMPLATE_CREATE', 'TEMPLATE_UPDATE', 'TEMPLATE_DELETE'])
        .describe('The webhook action type'),
      requestId: z.string().optional().describe('Request ID for render complete events'),
      href: z.string().optional().describe('CDN URL for render complete events'),
      templateId: z.string().optional().describe('Template ID for template lifecycle events'),
      templateName: z
        .string()
        .optional()
        .describe('Template name for template lifecycle events'),
      tags: z.array(z.string()).optional().describe('Tags for template lifecycle events'),
      previewUrl: z.string().optional().describe('Preview URL for template lifecycle events')
    })
  )
  .output(
    z.object({
      action: z
        .string()
        .describe(
          'The event action (RENDER_COMPLETE, TEMPLATE_CREATE, TEMPLATE_UPDATE, TEMPLATE_DELETE)'
        ),
      requestId: z.string().optional().describe('Request ID (render events)'),
      href: z.string().optional().describe('CDN URL of the rendered asset (render events)'),
      templateId: z.string().optional().describe('Template identifier (template events)'),
      templateName: z.string().optional().describe('Template name (template events)'),
      tags: z.array(z.string()).optional().describe('Template tags (template events)'),
      previewUrl: z.string().optional().describe('Template preview URL (template events)')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as Record<string, unknown>;

      let action = data.action as string;

      if (action === 'RENDER_COMPLETE') {
        return {
          inputs: [
            {
              action: action as 'RENDER_COMPLETE',
              requestId: data.requestId as string | undefined,
              href: data.href as string | undefined
            }
          ]
        };
      }

      return {
        inputs: [
          {
            action: action as 'TEMPLATE_CREATE' | 'TEMPLATE_UPDATE' | 'TEMPLATE_DELETE',
            templateId: data.templateId as string | undefined,
            templateName: data.name as string | undefined,
            tags: data.tags as string[] | undefined,
            previewUrl: data.preview as string | undefined
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let action = ctx.input.action;
      let eventId: string;

      if (action === 'RENDER_COMPLETE') {
        eventId = ctx.input.requestId || `render_${Date.now()}`;
      } else {
        eventId = `${ctx.input.templateId || 'unknown'}_${action}_${Date.now()}`;
      }

      let typeMap: Record<string, string> = {
        RENDER_COMPLETE: 'render.complete',
        TEMPLATE_CREATE: 'template.created',
        TEMPLATE_UPDATE: 'template.updated',
        TEMPLATE_DELETE: 'template.deleted'
      };

      return {
        type: typeMap[action] || action.toLowerCase(),
        id: eventId,
        output: {
          action: ctx.input.action,
          requestId: ctx.input.requestId,
          href: ctx.input.href,
          templateId: ctx.input.templateId,
          templateName: ctx.input.templateName,
          tags: ctx.input.tags,
          previewUrl: ctx.input.previewUrl
        }
      };
    }
  })
  .build();
