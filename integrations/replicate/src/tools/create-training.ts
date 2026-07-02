import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTraining = SlateTool.create(spec, {
  name: 'Create Training',
  key: 'create_training',
  description: `Start a fine-tuning training job on Replicate. Takes an existing model version and your training data to create a new fine-tuned model version at the specified destination.`,
  instructions: [
    'The destination model must exist before creating a training — create it first with the Create Model tool.',
    'Training inputs vary by model — check the model documentation for available training parameters.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Owner of the base model to fine-tune'),
      modelName: z.string().describe('Name of the base model to fine-tune'),
      versionId: z.string().describe('Version ID of the base model'),
      destination: z
        .string()
        .describe(
          'Destination model in owner/name format where the trained version will be created'
        ),
      input: z
        .record(z.string(), z.any())
        .describe('Training input parameters (varies by model)'),
      webhook: z.string().optional().describe('URL to receive webhook notifications'),
      webhookEventsFilter: z
        .array(z.enum(['start', 'output', 'logs', 'completed']))
        .optional()
        .describe('Which lifecycle events trigger webhooks')
    })
  )
  .output(
    z.object({
      trainingId: z.string().describe('Unique identifier of the training'),
      model: z.string().optional().describe('Base model identifier'),
      version: z.string().optional().describe('Base model version ID'),
      status: z.string().describe('Training status'),
      createdAt: z.string().describe('When the training was created'),
      urls: z.record(z.string(), z.string()).optional().describe('Related URLs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createTraining(
      ctx.input.owner,
      ctx.input.modelName,
      ctx.input.versionId,
      {
        destination: ctx.input.destination,
        input: ctx.input.input,
        webhook: ctx.input.webhook,
        webhookEventsFilter: ctx.input.webhookEventsFilter
      }
    );

    return {
      output: {
        trainingId: result.id,
        model: result.model,
        version: result.version,
        status: result.status,
        createdAt: result.created_at,
        urls: result.urls
      },
      message: `Training **${result.id}** created with status **${result.status}**, destination: **${ctx.input.destination}**.`
    };
  })
  .build();
