import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { parseOutput } from '../lib/output';
import { spec } from '../spec';

let outputSchema = z.object({
  raw: z
    .record(z.string(), z.any())
    .optional()
    .describe('Provider response with credentials removed'),
  projectId: z.string().describe('ID of the created project'),
  projectName: z.string().describe('Name of the created project'),
  stage: z.string().optional().describe('Current project stage'),
  target: z.string().optional().nullable().describe('Target variable if set')
});

export let createProject = SlateTool.create(spec, {
  name: 'Create Project',
  key: 'create_project',
  description: `Create a new DataRobot project from a dataset URL or an existing AI Catalog dataset. Optionally sets the target variable and starts Autopilot in one step.`,
  instructions: [
    'Provide either a datasetUrl (public URL to a CSV/dataset file) or a datasetId (from the AI Catalog) to create the project.',
    'To start Autopilot immediately, also provide the target field name and optionally the autopilot mode.'
  ]
})
  .input(
    z.object({
      projectName: z.string().describe('Name for the new project'),
      datasetUrl: z.string().optional().describe('URL of the dataset to upload'),
      datasetId: z.string().optional().describe('AI Catalog dataset ID to use'),
      target: z.string().optional().describe('Target variable name to set for modeling'),
      mode: z
        .enum(['auto', 'quick', 'manual', 'comprehensive'])
        .optional()
        .describe('Autopilot mode to use when target is set'),
      metric: z
        .string()
        .optional()
        .describe('Optimization metric to use (e.g. AUC, RMSE, LogLoss)'),
      positiveClass: z.string().optional().describe('Positive class for binary classification')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.auth.endpointUrl ?? ctx.config.endpointUrl
    });

    if (Boolean(ctx.input.datasetUrl) === Boolean(ctx.input.datasetId)) {
      throw createApiServiceError('Provide exactly one of datasetUrl or datasetId.');
    }
    if (
      !ctx.input.target &&
      (ctx.input.mode !== undefined ||
        ctx.input.metric !== undefined ||
        ctx.input.positiveClass !== undefined)
    ) {
      throw createApiServiceError('Provide target when configuring Autopilot options.');
    }
    let createBody: Record<string, unknown> = {
      projectName: ctx.input.projectName
    };
    if (ctx.input.datasetUrl) {
      createBody.url = ctx.input.datasetUrl;
    }
    if (ctx.input.datasetId) {
      createBody.datasetId = ctx.input.datasetId;
    }

    let project = await client.createProject(createBody);
    let projectId = project.id ?? project.projectId;

    if (ctx.input.target) {
      ctx.info('Setting target and starting Autopilot...');
      await client.setTarget(projectId, {
        target: ctx.input.target,
        mode: ctx.input.mode,
        metric: ctx.input.metric,
        positiveClass: ctx.input.positiveClass
      });

      project = await client.getProject(projectId);
    }

    return {
      output: parseOutput(outputSchema, {
        raw: project,
        projectId: projectId,
        projectName: project.projectName,
        stage: project.stage,
        target: project.target
      }),
      message: `Created project **${project.projectName}** (${projectId}).${ctx.input.target ? ` Autopilot started targeting **${ctx.input.target}**.` : ''}`
    };
  })
  .build();
