import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Retrieve detailed information about a specific DataRobot project including its configuration, target, stage, partition settings, and advanced options.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to retrieve')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique project identifier'),
      projectName: z.string().describe('Name of the project'),
      fileName: z.string().optional().describe('Name of the uploaded dataset file'),
      stage: z.string().optional().describe('Current project stage'),
      target: z.string().optional().nullable().describe('Target variable name'),
      targetType: z.string().optional().nullable().describe('Target variable type'),
      metric: z.string().optional().nullable().describe('Optimization metric'),
      autopilotMode: z.number().optional().nullable().describe('Autopilot mode'),
      created: z.string().optional().describe('Project creation timestamp'),
      maxTrainPct: z
        .number()
        .optional()
        .nullable()
        .describe('Maximum training data percentage'),
      maxTrainRows: z.number().optional().nullable().describe('Maximum training data rows'),
      holdoutUnlocked: z.boolean().optional().describe('Whether holdout data is unlocked'),
      positiveClass: z
        .string()
        .optional()
        .nullable()
        .describe('Positive class for binary classification')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.config.endpointUrl
    });

    let p = await client.getProject(ctx.input.projectId);

    return {
      output: {
        projectId: p.id || p.projectId,
        projectName: p.projectName,
        fileName: p.fileName,
        stage: p.stage,
        target: p.target,
        targetType: p.targetType,
        metric: p.metric,
        autopilotMode: p.autopilotMode,
        created: p.created,
        maxTrainPct: p.maxTrainPct,
        maxTrainRows: p.maxTrainRows,
        holdoutUnlocked: p.holdoutUnlocked,
        positiveClass: p.positiveClass
      },
      message: `Project **${p.projectName}** is in stage **${p.stage}**${p.target ? ` targeting **${p.target}**` : ''}.`
    };
  })
  .build();
