import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let editorEvent = SlateTrigger.create(spec, {
  name: 'Editor Event',
  key: 'editor_event',
  description:
    'Triggered when a user performs an action in the embedded editor: creates a new template, saves a template, or downloads a template.'
})
  .input(
    z.object({
      action: z
        .enum(['create', 'save', 'download'])
        .describe('The action performed in the editor'),
      templateId: z.string().describe('Template ID affected by the action'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata passed from the embedding application')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Template ID affected by the action'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom metadata from the embedding application')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as {
        action?: string;
        templateId?: string;
        metadata?: Record<string, any>;
      };

      let action = body.action as 'create' | 'save' | 'download';
      if (!action || !['create', 'save', 'download'].includes(action)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            action,
            templateId: body.templateId || '',
            metadata: body.metadata
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `template.${ctx.input.action}`,
        id: `${ctx.input.templateId}-${ctx.input.action}-${Date.now()}`,
        output: {
          templateId: ctx.input.templateId,
          metadata: ctx.input.metadata
        }
      };
    }
  })
  .build();
