import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let projectEventInput = z.object({
  eventName: z.string().describe('Todoist event name'),
  deliveryId: z.string().describe('Unique delivery ID'),
  eventData: z.any().describe('Raw project event data')
});

let projectOutput = z.object({
  projectId: z.string().describe('Project ID'),
  name: z.string().describe('Project name'),
  color: z.string().optional().describe('Project color'),
  parentId: z.string().nullable().describe('Parent project ID'),
  isShared: z.boolean().optional().describe('Whether project is shared'),
  isFavorite: z.boolean().optional().describe('Whether project is favorited'),
  isArchived: z.boolean().optional().describe('Whether project is archived')
});

let eventNameToType: Record<string, string> = {
  'project:added': 'project.created',
  'project:updated': 'project.updated',
  'project:deleted': 'project.deleted',
  'project:archived': 'project.archived',
  'project:unarchived': 'project.unarchived'
};

export let projectEvents = SlateTrigger.create(spec, {
  name: 'Project Events',
  key: 'project_events',
  description:
    'Triggers when projects are created, updated, deleted, archived, or unarchived in Todoist.'
})
  .input(projectEventInput)
  .output(projectOutput)
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.event_name || '';
      let deliveryId = ctx.request.headers.get('X-Todoist-Delivery-ID') || `${Date.now()}`;

      let validEvents = [
        'project:added',
        'project:updated',
        'project:deleted',
        'project:archived',
        'project:unarchived'
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
      let type = eventNameToType[ctx.input.eventName] || 'project.unknown';

      return {
        type,
        id: ctx.input.deliveryId,
        output: {
          projectId: String(data.id || ''),
          name: data.name || '',
          color: data.color,
          parentId: data.parent_id ? String(data.parent_id) : null,
          isShared: data.is_shared,
          isFavorite: data.is_favorite,
          isArchived: data.is_archived
        }
      };
    }
  });
