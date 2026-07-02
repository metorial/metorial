import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { replicateServiceError } from '../lib/errors';
import { spec } from '../spec';

let predictionSchema = z.object({
  predictionId: z.string().describe('Unique identifier of the prediction'),
  model: z.string().optional().describe('Model identifier (owner/name)'),
  version: z.string().optional().describe('Model version ID used'),
  status: z
    .string()
    .describe('Current status: starting, processing, succeeded, failed, canceled, or aborted'),
  input: z.any().optional().describe('Input provided to the model'),
  output: z.any().optional().describe('Model output (null until completed)'),
  error: z.string().optional().nullable().describe('Error message if prediction failed'),
  logs: z.string().optional().describe('Log output from the prediction'),
  metrics: z
    .record(z.string(), z.any())
    .optional()
    .describe('Prediction metrics like predict_time and total_time'),
  dataRemoved: z
    .boolean()
    .optional()
    .describe('Whether the prediction output has been deleted'),
  source: z.enum(['api', 'web']).optional().describe('How the prediction was created'),
  deadline: z
    .string()
    .optional()
    .nullable()
    .describe('When the prediction will be automatically canceled'),
  deployment: z.string().optional().describe('Deployment that created the prediction'),
  createdAt: z.string().describe('When the prediction was created'),
  startedAt: z
    .string()
    .optional()
    .nullable()
    .describe('When the prediction started processing'),
  completedAt: z.string().optional().nullable().describe('When the prediction completed'),
  urls: z
    .record(z.string(), z.string())
    .optional()
    .describe('Related URLs (get, cancel, stream)')
});

export let runPrediction = SlateTool.create(spec, {
  name: 'Run Prediction',
  key: 'run_prediction',
  description: `Run an AI model prediction on Replicate. Provide either a **model** identifier (e.g. \`stability-ai/sdxl\`) or a specific **version** ID. You can also target a **deployment** for production workloads.
Use this to generate images, text, audio, or any output supported by the model.`,
  instructions: [
    'Provide exactly one target: "model" for official models, "version" for a model/version identifier, or both "deploymentOwner" and "deploymentName" for deployments.',
    'For non-official community models, provide "version" as a version ID or owner/name:version_id.',
    "Input fields vary by model - check the model's API tab for available inputs."
  ],
  constraints: [
    'Prediction inputs and outputs are automatically deleted after 1 hour.',
    'Rate limit: 600 prediction creation requests per minute.',
    'The stream field is deprecated by Replicate; supported models now return a stream URL automatically.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .optional()
        .describe(
          'Official model identifier in owner/name format (e.g. "black-forest-labs/flux-schnell")'
        ),
      version: z
        .string()
        .optional()
        .describe(
          'Model version identifier to run: a 64-character version ID or owner/name:version_id'
        ),
      deploymentOwner: z
        .string()
        .optional()
        .describe('Deployment owner for running on a deployment'),
      deploymentName: z
        .string()
        .optional()
        .describe('Deployment name for running on a deployment'),
      input: z
        .record(z.string(), z.any())
        .describe('Model input parameters (varies by model)'),
      webhook: z.string().optional().describe('URL to receive webhook notifications'),
      webhookEventsFilter: z
        .array(z.enum(['start', 'output', 'logs', 'completed']))
        .optional()
        .describe('Which lifecycle events trigger webhooks'),
      stream: z
        .boolean()
        .optional()
        .describe(
          'Deprecated by Replicate. Stream URLs are returned automatically when supported.'
        ),
      waitSeconds: z
        .number()
        .int()
        .min(1)
        .max(60)
        .optional()
        .describe('Keep the request open for up to this many seconds using the Prefer header'),
      cancelAfter: z
        .string()
        .optional()
        .describe(
          'Automatically cancel the prediction after a duration such as "30s", "5m", or "1h30m"'
        )
    })
  )
  .output(predictionSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;
    let hasDeploymentOwner = ctx.input.deploymentOwner !== undefined;
    let hasDeploymentName = ctx.input.deploymentName !== undefined;
    let hasDeployment = hasDeploymentOwner || hasDeploymentName;
    let hasModel = ctx.input.model !== undefined;
    let hasVersion = ctx.input.version !== undefined;

    if (hasDeploymentOwner !== hasDeploymentName) {
      throw replicateServiceError(
        'Provide both deploymentOwner and deploymentName for deployment predictions.'
      );
    }

    let targetCount = Number(hasDeployment) + Number(hasModel) + Number(hasVersion);
    if (targetCount !== 1) {
      throw replicateServiceError(
        'Provide exactly one prediction target: model, version, or deploymentOwner/deploymentName.'
      );
    }

    if (ctx.input.deploymentOwner && ctx.input.deploymentName) {
      result = await client.createDeploymentPrediction(
        ctx.input.deploymentOwner,
        ctx.input.deploymentName,
        {
          input: ctx.input.input,
          webhook: ctx.input.webhook,
          webhookEventsFilter: ctx.input.webhookEventsFilter,
          stream: ctx.input.stream,
          waitSeconds: ctx.input.waitSeconds,
          cancelAfter: ctx.input.cancelAfter
        }
      );
    } else if (ctx.input.model) {
      let [owner, name] = ctx.input.model.split('/');
      if (!owner || !name || ctx.input.model.split('/').length !== 2) {
        throw replicateServiceError('model must use owner/name format.');
      }

      result = await client.createModelPrediction(owner, name, {
        input: ctx.input.input,
        webhook: ctx.input.webhook,
        webhookEventsFilter: ctx.input.webhookEventsFilter,
        stream: ctx.input.stream,
        waitSeconds: ctx.input.waitSeconds,
        cancelAfter: ctx.input.cancelAfter
      });
    } else if (ctx.input.version) {
      result = await client.createPrediction({
        version: ctx.input.version,
        input: ctx.input.input,
        webhook: ctx.input.webhook,
        webhookEventsFilter: ctx.input.webhookEventsFilter,
        stream: ctx.input.stream,
        waitSeconds: ctx.input.waitSeconds,
        cancelAfter: ctx.input.cancelAfter
      });
    }

    return {
      output: {
        predictionId: result.id,
        model: result.model,
        version: result.version,
        status: result.status,
        input: result.input,
        output: result.output,
        error: result.error,
        logs: result.logs,
        metrics: result.metrics,
        dataRemoved: result.data_removed,
        source: result.source,
        deadline: result.deadline,
        deployment: result.deployment,
        createdAt: result.created_at,
        startedAt: result.started_at,
        completedAt: result.completed_at,
        urls: result.urls
      },
      message: `Prediction **${result.id}** created with status **${result.status}**.`
    };
  })
  .build();
