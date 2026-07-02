import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newTemplateCreated = SlateTrigger.create(spec, {
  name: 'New Template Created',
  key: 'new_template_created',
  description:
    "Triggers when a new design template is created in the authenticated user's account."
})
  .input(
    z.object({
      templateId: z.string().describe('Unique template identifier'),
      name: z.string().describe('Template name'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().describe('ISO 8601 last update timestamp')
    })
  )
  .output(
    z.object({
      templateId: z.string().describe('Unique template identifier'),
      name: z.string().describe('Template name'),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      updatedAt: z.string().describe('ISO 8601 last update timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let templates = await client.listTemplates({
        sort: 'createdAt',
        order: 'desc'
      });

      let templateList = Array.isArray(templates) ? templates : [];
      let lastTimestamp = (ctx.state as any)?.lastTimestamp as string | undefined;

      let newTemplates = lastTimestamp
        ? templateList.filter(
            (t: any) => new Date(t.createdAt).getTime() > new Date(lastTimestamp!).getTime()
          )
        : templateList;

      let updatedTimestamp =
        templateList.length > 0 ? templateList[0].createdAt : lastTimestamp;

      return {
        inputs: newTemplates.map((t: any) => ({
          templateId: t.id,
          name: t.name,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt
        })),
        updatedState: {
          lastTimestamp: updatedTimestamp
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'template.created',
        id: ctx.input.templateId,
        output: {
          templateId: ctx.input.templateId,
          name: ctx.input.name,
          createdAt: ctx.input.createdAt,
          updatedAt: ctx.input.updatedAt
        }
      };
    }
  })
  .build();
