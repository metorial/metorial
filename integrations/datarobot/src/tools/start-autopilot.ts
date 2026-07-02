import { SlateTool } from 'slates';
import { z } from 'zod';
import { DataRobotClient } from '../lib/client';
import { spec } from '../spec';

export let startAutopilot = SlateTool.create(spec, {
  name: 'Start Autopilot',
  key: 'start_autopilot',
  description: `Set the target variable and start Autopilot on an existing project. Autopilot automatically selects and trains the best predictive models for the specified target feature. Supports configuration of mode, metric, and advanced options.`,
  instructions: [
    'The project must already have a dataset uploaded before starting Autopilot.',
    'Mode options: "auto" (full automatic), "quick" (faster but fewer models), "comprehensive" (most thorough), "manual" (no automatic model building).'
  ]
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project to start Autopilot on'),
      target: z.string().describe('Name of the target variable to predict'),
      mode: z
        .enum(['auto', 'quick', 'manual', 'comprehensive'])
        .optional()
        .describe('Autopilot mode'),
      metric: z
        .string()
        .optional()
        .describe('Optimization metric (e.g. AUC, RMSE, LogLoss, FVE Gamma Deviance)'),
      positiveClass: z
        .string()
        .optional()
        .describe('Positive class label for binary classification'),
      blueprintThreshold: z
        .number()
        .optional()
        .describe('Max runtime in hours for models to be included in Autopilot'),
      accuracyOptimizedMb: z
        .boolean()
        .optional()
        .describe('Include additional longer-running models'),
      smartDownsampled: z
        .boolean()
        .optional()
        .describe('Enable smart downsampling for imbalanced datasets'),
      majorityDownsamplingRate: z
        .number()
        .optional()
        .describe('Downsampling rate for the majority class (0-100)'),
      seed: z.number().optional().describe('Random seed for reproducibility')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('ID of the project'),
      projectName: z.string().describe('Name of the project'),
      stage: z.string().optional().describe('Current project stage after setting target'),
      target: z.string().optional().nullable().describe('Target variable name'),
      targetType: z.string().optional().nullable().describe('Inferred target type'),
      metric: z.string().optional().nullable().describe('Optimization metric being used')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DataRobotClient({
      token: ctx.auth.token,
      endpointUrl: ctx.config.endpointUrl
    });

    await client.setTarget(ctx.input.projectId, {
      target: ctx.input.target,
      mode: ctx.input.mode,
      metric: ctx.input.metric,
      positiveClass: ctx.input.positiveClass,
      blueprintThreshold: ctx.input.blueprintThreshold,
      accuracyOptimizedMb: ctx.input.accuracyOptimizedMb,
      smartDownsampled: ctx.input.smartDownsampled,
      majorityDownsamplingRate: ctx.input.majorityDownsamplingRate,
      seed: ctx.input.seed
    });

    let project = await client.getProject(ctx.input.projectId);

    return {
      output: {
        projectId: project.id || project.projectId,
        projectName: project.projectName,
        stage: project.stage,
        target: project.target,
        targetType: project.targetType,
        metric: project.metric
      },
      message: `Autopilot started on project **${project.projectName}** targeting **${ctx.input.target}**${ctx.input.mode ? ` in ${ctx.input.mode} mode` : ''}.`
    };
  })
  .build();
