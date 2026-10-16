import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let outputSchema = z.object({
  raw: z
    .record(z.string(), z.any())
    .optional()
    .describe('Provider response with credentials removed'),
  projectId: z.string().describe('Unique project identifier'),
  projectName: z.string().describe('Name of the project'),
  fileName: z.string().optional().describe('Name of the uploaded dataset file'),
  stage: z.string().optional().describe('Current project stage'),
  target: z.string().optional().nullable().describe('Target variable name'),
  targetType: z.string().optional().nullable().describe('Target variable type'),
  metric: z.string().optional().nullable().describe('Optimization metric'),
  autopilotMode: z.number().optional().nullable().describe('Autopilot mode'),
  created: z.string().optional().describe('Project creation timestamp'),
  maxTrainPct: z.number().optional().nullable().describe('Maximum training data percentage'),
  maxTrainRows: z.number().optional().nullable().describe('Maximum training data rows'),
  holdoutUnlocked: z.boolean().optional().describe('Whether holdout data is unlocked'),
  positiveClass: z
    .string()
    .optional()
    .nullable()
    .describe('Positive class for binary classification')
});

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
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });

    let p = await client.getProject(ctx.input.projectId);

    return {
      output: parseOutput(outputSchema, {
        raw: p,
        projectId: p.id ?? p.projectId,
        projectName: p.projectName,
        fileName: p.fileName,
        stage: p.stage,
        target: p.target,
        targetType: p.targetType,
        metric: p.metric,
        autopilotMode:
          typeof p.autopilotMode === 'string' && ['0', '2', '3', '4'].includes(p.autopilotMode)
            ? Number(p.autopilotMode)
            : p.autopilotMode,
        created: p.created,
        maxTrainPct: p.maxTrainPct,
        maxTrainRows: p.maxTrainRows,
        holdoutUnlocked: p.holdoutUnlocked,
        positiveClass: typeof p.positiveClass === 'number' ? undefined : p.positiveClass
      }),
      message: `Project **${p.projectName}** is in stage **${p.stage}**${p.target ? ` targeting **${p.target}**` : ''}.`
    };
  })
  .build();
