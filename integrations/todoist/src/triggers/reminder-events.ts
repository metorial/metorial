import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let reminderEventInput = z.object({
  eventName: z.string().describe('Todoist event name'),
  deliveryId: z.string().describe('Unique delivery ID'),
  eventData: z.any().describe('Raw reminder event data')
});

let reminderOutput = z.object({
  reminderId: z.string().describe('Reminder ID'),
  taskId: z.string().describe('Associated task ID'),
  type: z.string().optional().describe('Reminder type (relative, absolute, location)'),
  dueDate: z.string().optional().describe('Reminder due date')
});

export let reminderEvents = SlateTrigger.create(spec, {
  name: 'Reminder Fired',
  key: 'reminder_fired',
  description: 'Triggers when a reminder fires in Todoist.'
})
  .input(reminderEventInput)
  .output(reminderOutput)
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.event_name || '';
      let deliveryId = ctx.request.headers.get('X-Todoist-Delivery-ID') || `${Date.now()}`;

      if (eventName !== 'reminder:fired') {
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

      return {
        type: 'reminder.fired',
        id: ctx.input.deliveryId,
        output: {
          reminderId: String(data.id || ''),
          taskId: String(data.item_id || data.task_id || ''),
          type: data.type,
          dueDate: data.due?.date || data.due_date
        }
      };
    }
  });
