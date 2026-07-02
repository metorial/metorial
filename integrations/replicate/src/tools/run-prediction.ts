import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let predictionSchema = z.object({
  predictionId: z.string().describe('Unique identifier of the prediction'),
  model: z.string().optional().describe('Model identifier (owner/name)'),
  version: z.string().optional().describe('Model version ID used'),
  status: z
    .string()
    .describe('Current status: starting, processing, succeeded, failed, canceled'),
  input: z.any().optional().describe('Input provided to the model'),
  output: z.any().optional().describe('Model output (null until completed)'),
  error: z.string().optional().nullable().describe('Error message if prediction failed'),
  logs: z.string().optional().describe('Log output from the prediction'),
  metrics: z
    .record(z.string(), z.any())
    .optional()
    .describe('Prediction metrics like predict_time and total_time'),
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
    'Provide either "model" (owner/name format) or "version" (full version hash) to identify what to run.',
    'For deployment predictions, provide "deploymentOwner" and "deploymentName" instead.',
    "Input fields vary by model — check the model's API tab for available inputs."
  ],
  constraints: [
    'Prediction inputs and outputs are automatically deleted after 1 hour.',
    'Rate limit: 600 prediction creation requests per minute.'
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
        .describe('Model identifier in owner/name format (e.g. "stability-ai/sdxl")'),
      version: z.string().optional().describe('Specific model version ID to run'),
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
      stream: z.boolean().optional().describe('Request streaming output for supported models')
    })
  )
  .output(predictionSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.deploymentOwner && ctx.input.deploymentName) {
      result = await client.createDeploymentPrediction(
        ctx.input.deploymentOwner,
        ctx.input.deploymentName,
        {
          input: ctx.input.input,
          webhook: ctx.input.webhook,
          webhookEventsFilter: ctx.input.webhookEventsFilter,
          stream: ctx.input.stream
        }
      );
    } else if (ctx.input.model && !ctx.input.version) {
      let [owner, name] = ctx.input.model.split('/');
      if (owner && name) {
        result = await client.createModelPrediction(owner, name, {
          input: ctx.input.input,
          webhook: ctx.input.webhook,
          webhookEventsFilter: ctx.input.webhookEventsFilter,
          stream: ctx.input.stream
        });
      } else {
        result = await client.createPrediction({
          model: ctx.input.model,
          input: ctx.input.input,
          webhook: ctx.input.webhook,
          webhookEventsFilter: ctx.input.webhookEventsFilter,
          stream: ctx.input.stream
        });
      }
    } else {
      result = await client.createPrediction({
        version: ctx.input.version,
        model: ctx.input.model,
        input: ctx.input.input,
        webhook: ctx.input.webhook,
        webhookEventsFilter: ctx.input.webhookEventsFilter,
        stream: ctx.input.stream
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
        createdAt: result.created_at,
        startedAt: result.started_at,
        completedAt: result.completed_at,
        urls: result.urls
      },
      message: `Prediction **${result.id}** created with status **${result.status}**.`
    };
  })
  .build();
