import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let sectionEventInput = z.object({
  eventName: z.string().describe('Todoist event name'),
  deliveryId: z.string().describe('Unique delivery ID'),
  eventData: z.any().describe('Raw section event data')
});

let sectionOutput = z.object({
  sectionId: z.string().describe('Section ID'),
  name: z.string().describe('Section name'),
  projectId: z.string().describe('Parent project ID'),
  order: z.number().optional().describe('Section order'),
  isArchived: z.boolean().optional().describe('Whether section is archived')
});

let eventNameToType: Record<string, string> = {
  'section:added': 'section.created',
  'section:updated': 'section.updated',
  'section:deleted': 'section.deleted',
  'section:archived': 'section.archived',
  'section:unarchived': 'section.unarchived'
};

export let sectionEvents = SlateTrigger.create(spec, {
  name: 'Section Events',
  key: 'section_events',
  description:
    'Triggers when sections are created, updated, deleted, archived, or unarchived in Todoist.'
})
  .input(sectionEventInput)
  .output(sectionOutput)
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.event_name || '';
      let deliveryId = ctx.request.headers.get('X-Todoist-Delivery-ID') || `${Date.now()}`;

      let validEvents = [
        'section:added',
        'section:updated',
        'section:deleted',
        'section:archived',
        'section:unarchived'
      ];
      if (!validEvents.includes(eventName)) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            eventName,
            deliveryId,
            eventData: body.event_data || body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let data = ctx.input.eventData;
      let type = eventNameToType[ctx.input.eventName] || 'section.unknown';

      return {
        type,
        id: ctx.input.deliveryId,
        output: {
          sectionId: String(data.id || ''),
          name: data.name || '',
          projectId: String(data.project_id || ''),
          order: data.section_order ?? data.order,
          isArchived: data.is_archived
        }
      };
    }
  });
