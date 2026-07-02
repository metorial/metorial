import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

let taskEventInput = z.object({
  eventName: z.string().describe('Todoist event name'),
  deliveryId: z.string().describe('Unique delivery ID'),
  eventData: z.any().describe('Raw task event data from Todoist')
});

let taskOutput = z.object({
  taskId: z.string().describe('Task ID'),
  content: z.string().describe('Task content'),
  description: z.string().describe('Task description'),
  projectId: z.string().describe('Project ID'),
  sectionId: z.string().nullable().describe('Section ID'),
  parentId: z.string().nullable().describe('Parent task ID'),
  labels: z.array(z.string()).describe('Applied labels'),
  priority: z.number().describe('Task priority'),
  due: z
    .object({
      string: z.string().optional(),
      date: z.string().optional(),
      isRecurring: z.boolean().optional(),
      datetime: z.string().optional(),
      timezone: z.string().optional()
    })
    .nullable()
    .describe('Due date information'),
  assigneeId: z.string().nullable().describe('Assigned collaborator ID'),
  isCompleted: z.boolean().describe('Whether task is completed'),
  url: z.string().optional().describe('Task URL'),
  createdAt: z.string().optional().describe('Task creation timestamp')
});

let eventNameToType: Record<string, string> = {
  'item:added': 'task.created',
  'item:updated': 'task.updated',
  'item:deleted': 'task.deleted',
  'item:completed': 'task.completed',
  'item:uncompleted': 'task.uncompleted'
};

export let taskEvents = SlateTrigger.create(spec, {
  name: 'Task Events',
  key: 'task_events',
  description:
    'Triggers when tasks are created, updated, deleted, completed, or uncompleted in Todoist.'
})
  .input(taskEventInput)
  .output(taskOutput)
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let eventName = body.event_name || '';
      let deliveryId = ctx.request.headers.get('X-Todoist-Delivery-ID') || `${Date.now()}`;

      let validEvents = [
        'item:added',
        'item:updated',
        'item:deleted',
        'item:completed',
        'item:uncompleted'
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
      let type = eventNameToType[ctx.input.eventName] || 'task.unknown';

      return {
        type,
        id: ctx.input.deliveryId,
        output: {
          taskId: String(data.id || ''),
          content: data.content || '',
          description: data.description || '',
          projectId: String(data.project_id || ''),
          sectionId: data.section_id ? String(data.section_id) : null,
          parentId: data.parent_id ? String(data.parent_id) : null,
          labels: data.labels || [],
          priority: data.priority || 1,
          due: data.due
            ? {
                string: data.due.string,
                date: data.due.date,
                isRecurring: data.due.is_recurring,
                datetime: data.due.datetime,
                timezone: data.due.timezone
              }
            : null,
          assigneeId: data.responsible_uid
            ? String(data.responsible_uid)
            : data.assignee_id
              ? String(data.assignee_id)
              : null,
          isCompleted: data.checked === 1 || data.is_completed === true,
          url: data.url,
          createdAt: data.added_at || data.created_at
        }
      };
    }
  });
