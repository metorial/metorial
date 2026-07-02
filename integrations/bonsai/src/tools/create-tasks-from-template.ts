import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTasksFromTemplate = SlateTool.create(spec, {
  name: 'Create Tasks From Template',
  key: 'create_tasks_from_template',
  description: `Add tasks from a task template to an existing project in Bonsai. Quickly populate a project with predefined tasks from your saved templates.`,
  instructions: [
    'Both **projectId** and **templateId** are required.',
    'Use the list tools to find available project IDs and task template IDs.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to add tasks to'),
      templateId: z.string().describe('ID of the task template to use')
    })
  )
  .output(
    z.object({
      tasks: z
        .array(
          z.object({
            taskId: z.string().describe('ID of the created task'),
            title: z.string().describe('Title of the task'),
            status: z.string().optional().describe('Task status'),
            priority: z.string().optional().describe('Task priority'),
            dueDate: z.string().optional().describe('Due date')
          })
        )
        .describe('List of tasks created from the template'),
      taskCount: z.number().describe('Number of tasks created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let tasks = await client.createTasksFromTemplate({
      projectId: ctx.input.projectId,
      templateId: ctx.input.templateId
    });

    return {
      output: {
        tasks: tasks.map(t => ({
          taskId: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
          dueDate: t.dueDate
        })),
        taskCount: tasks.length
      },
      message: `Created **${tasks.length}** tasks from template \`${ctx.input.templateId}\` in project \`${ctx.input.projectId}\`.`
    };
  })
  .build();
