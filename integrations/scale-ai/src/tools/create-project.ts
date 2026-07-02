import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new annotation project in Scale AI. A project is tied to one specific task type and use case. You can configure default parameters, instructions, and ontology settings that apply to all tasks created under the project.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      projectName: z.string().describe('Unique name for the project'),
      taskType: z
        .string()
        .describe(
          'Task type for all tasks in this project (e.g., imageannotation, textcollection, documenttranscription, videoannotation, lidarannotation)'
        ),
      rapid: z.boolean().optional().describe('Whether this is a Scale Rapid project'),
      studio: z.boolean().optional().describe('Whether this is a Scale Studio project'),
      defaultParams: z
        .record(z.string(), z.any())
        .optional()
        .describe('Default parameters inherited by tasks created under this project'),
      pipeline: z
        .enum(['standard_task', 'consensus_task'])
        .optional()
        .describe('Pipeline type (Studio projects only)'),
      consensusAttempts: z
        .number()
        .optional()
        .describe('Number of consensus attempts (Studio consensus projects only)')
    })
  )
  .output(
    z
      .object({
        projectName: z.string().describe('Name of the created project'),
        taskType: z.string().describe('Task type associated with the project'),
        createdAt: z.string().optional().describe('ISO 8601 creation timestamp')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createProject({
      name: ctx.input.projectName,
      type: ctx.input.taskType,
      rapid: ctx.input.rapid,
      studio: ctx.input.studio,
      params: ctx.input.defaultParams,
      pipeline: ctx.input.pipeline,
      consensusAttempts: ctx.input.consensusAttempts
    });

    return {
      output: {
        projectName: result.name ?? ctx.input.projectName,
        taskType: result.type ?? ctx.input.taskType,
        createdAt: result.created_at,
        ...result
      },
      message: `Created project **${ctx.input.projectName}** with task type \`${ctx.input.taskType}\`.`
    };
  })
  .build();
