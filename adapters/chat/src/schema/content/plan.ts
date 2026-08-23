import { z } from 'zod';
import { card, field, fields, text } from '../../builders/card';
import type { ChatPart } from './part';

export let planTaskStatusSchema = z.enum(['pending', 'in_progress', 'complete', 'error']);

export let planTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: planTaskStatusSchema,
  details: z.string().optional(),
  output: z.string().optional()
});

export let planSchema = z.object({
  title: z.string(),
  tasks: z.array(planTaskSchema)
});

export type PlanTaskStatus = z.infer<typeof planTaskStatusSchema>;
export type PlanTask = z.infer<typeof planTaskSchema>;
export type Plan = z.infer<typeof planSchema>;

export let planToParts = (plan: Plan): ChatPart[] => {
  let statusFields = plan.tasks.map(task =>
    field({
      label: task.title,
      value: task.output ?? task.details ?? task.status
    })
  );

  return [
    card({
      title: plan.title,
      children: [...(statusFields.length > 0 ? [fields(statusFields)] : [text('No tasks')])]
    })
  ];
};
