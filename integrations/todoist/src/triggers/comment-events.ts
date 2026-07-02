import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let commentEventInput = z.object({
  eventName: z.string().describe('Todoist event name'),
  deliveryId: z.string().describe('Unique delivery ID'),
  eventData: z.any().describe('Raw comment event data')
});

let commentOutput = z.object({
  commentId: z.string().describe('Comment ID'),
  content: z.string().describe('Comment content'),
  taskId: z.string().nullable().describe('Associated task ID'),
  projectId: z.string().nullable().describe('Associated project ID'),
  postedAt: z.string().optional().describe('When comment was posted')
});

let eventNameToType: Record<string, string> = {
  'note:added': 'comment.created',
  'note:updated': 'comment.updated',
  'note:deleted': 'comment.deleted'
};

export let commentEvents = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description:
    'Triggers when comments are created, updated, or deleted on tasks or projects in Todoist.'
})
  .input(commentEventInput)
  .output(commentOutput)
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.event_name || '';
      let deliveryId = ctx.request.headers.get('X-Todoist-Delivery-ID') || `${Date.now()}`;

      let validEvents = ['note:added', 'note:updated', 'note:deleted'];
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
      let type = eventNameToType[ctx.input.eventName] || 'comment.unknown';

      return {
        type,
        id: ctx.input.deliveryId,
        output: {
          commentId: String(data.id || ''),
          content: data.content || '',
          taskId: data.item_id
            ? String(data.item_id)
            : data.task_id
              ? String(data.task_id)
              : null,
          projectId: data.project_id ? String(data.project_id) : null,
          postedAt: data.posted_at || data.posted
        }
      };
    }
  });
