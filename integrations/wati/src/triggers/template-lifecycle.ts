import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let templateLifecycle = SlateTrigger.create(spec, {
  name: 'Template Lifecycle Update',
  key: 'template_lifecycle',
  description: "Triggered when a message template's status, quality, or category changes."
})
  .input(
    z.object({
      eventType: z.string().describe('The webhook event type.'),
      eventId: z.string().describe('Unique event identifier.'),
      payload: z.any().describe('Raw event payload from Wati.')
    })
  )
  .output(
    z.object({
      eventType: z
        .string()
        .describe('Type of template event (status_update, quality_update, category_update).'),
      templateId: z.string().optional().describe('Template identifier.'),
      templateName: z.string().optional().describe('Template name.'),
      status: z.string().optional().describe('New template status.'),
      quality: z.string().optional().describe('New quality score.'),
      category: z.string().optional().describe('New category.')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data?.eventType || '';
      let templateEvents = [
        'templateStatusUpdate',
        'templateQualityUpdate',
        'templateCategoryUpdate'
      ];

      if (!templateEvents.includes(eventType)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventType,
            eventId: data.id || data.templateId || `${eventType}_${Date.now()}`,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventTypeMap: Record<string, string> = {
        templateStatusUpdate: 'template.status_update',
        templateQualityUpdate: 'template.quality_update',
        templateCategoryUpdate: 'template.category_update'
      };

      let type = eventTypeMap[ctx.input.eventType] || `template.${ctx.input.eventType}`;
      let payload = ctx.input.payload;

      return {
        type,
        id: ctx.input.eventId,
        output: {
          eventType: ctx.input.eventType,
          templateId: payload?.templateId || payload?.id,
          templateName: payload?.templateName || payload?.name,
          status: payload?.status,
          quality: payload?.quality || payload?.qualityScore,
          category: payload?.category
        }
      };
    }
  })
  .build();
