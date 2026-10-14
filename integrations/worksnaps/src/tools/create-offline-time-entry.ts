import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOfflineTimeEntry = SlateTool.create(spec, {
  name: 'Create Offline Time Entry',
  key: 'create_offline_time_entry',
  description:
    'Log offline time in a project for yourself or another user. Call list_projects to choose a project and list_users to discover user IDs.',
  instructions: [
    'Omit userId to log time for the authenticated user.',
    'Logging time for another user requires being a manager of the project.',
    'Use get_time_entries to find the IDs of the created time entries.'
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      projectId: z
        .string()
        .min(1)
        .describe('Project ID. Call list_projects to discover available projects.'),
      userId: z
        .string()
        .min(1)
        .optional()
        .describe('User ID from list_users. Omit to log time for yourself.'),
      taskId: z
        .string()
        .min(1)
        .optional()
        .describe('Task ID from list_tasks in the selected project.'),
      fromTimestamp: z
        .string()
        .describe('Start timestamp in Unix epoch seconds at a 10-minute boundary'),
      durationInMinutes: z
        .number()
        .int()
        .positive()
        .describe('Duration of offline work in whole minutes'),
      userComment: z.string().optional().describe('Comment describing the offline work')
    })
  )
  .output(
    z.object({
      created: z.boolean().describe('Whether Worksnaps accepted the offline time creation'),
      result: z
        .record(z.string(), z.unknown())
        .describe('Provider response; it may only contain an acknowledgement')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).createOfflineTimeEntry(
      ctx.input.projectId,
      ctx.input.userId,
      {
        taskId: ctx.input.taskId,
        fromTimestamp: ctx.input.fromTimestamp,
        durationInMinutes: ctx.input.durationInMinutes,
        userComment: ctx.input.userComment
      }
    );
    return {
      output: { created: true, result },
      message: `Logged **${ctx.input.durationInMinutes}** minutes of offline time in project **${ctx.input.projectId}**.`
    };
  })
  .build();
