import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createFineTuningJob = SlateTool.create(spec, {
  name: 'Create Fine-Tuning Job',
  key: 'create_fine_tuning_job',
  description: `Create a new fine-tuning job to customize an OpenAI model on your training data. Supports supervised fine-tuning and direct preference optimization (DPO). Configure hyperparameters such as epochs, batch size, and learning rate.`,
  instructions: [
    'The training file must be a JSONL file that has been uploaded via the Files API with purpose "fine-tune".'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      model: z.string().describe('Base model to fine-tune (e.g. "gpt-4o-mini-2024-07-18")'),
      trainingFileId: z.string().describe('ID of the uploaded training file (JSONL format)'),
      validationFileId: z.string().optional().describe('ID of an optional validation file'),
      suffix: z
        .string()
        .optional()
        .describe('Custom suffix for the fine-tuned model name (up to 18 characters)'),
      nEpochs: z
        .union([z.number(), z.literal('auto')])
        .optional()
        .describe('Number of training epochs, or "auto"'),
      batchSize: z
        .union([z.number(), z.literal('auto')])
        .optional()
        .describe('Batch size for training, or "auto"'),
      learningRateMultiplier: z
        .union([z.number(), z.literal('auto')])
        .optional()
        .describe('Learning rate multiplier, or "auto"')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Fine-tuning job ID'),
      model: z.string().describe('Base model being fine-tuned'),
      status: z.string().describe('Current status of the job'),
      createdAt: z.number().describe('Unix timestamp when the job was created'),
      fineTunedModel: z
        .string()
        .nullable()
        .describe('Name of the fine-tuned model once complete')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let hyperparameters: any;
    if (
      ctx.input.nEpochs !== undefined ||
      ctx.input.batchSize !== undefined ||
      ctx.input.learningRateMultiplier !== undefined
    ) {
      hyperparameters = {};
      if (ctx.input.nEpochs !== undefined) hyperparameters.nEpochs = ctx.input.nEpochs;
      if (ctx.input.batchSize !== undefined) hyperparameters.batchSize = ctx.input.batchSize;
      if (ctx.input.learningRateMultiplier !== undefined)
        hyperparameters.learningRateMultiplier = ctx.input.learningRateMultiplier;
    }

    let result = await client.createFineTuningJob({
      model: ctx.input.model,
      trainingFile: ctx.input.trainingFileId,
      validationFile: ctx.input.validationFileId,
      suffix: ctx.input.suffix,
      hyperparameters
    });

    return {
      output: {
        jobId: result.id,
        model: result.model,
        status: result.status,
        createdAt: result.created_at,
        fineTunedModel: result.fine_tuned_model ?? null
      },
      message: `Created fine-tuning job **${result.id}** on model **${result.model}**. Status: ${result.status}.`
    };
  })
  .build();

export let getFineTuningJob = SlateTool.create(spec, {
  name: 'Get Fine-Tuning Job',
  key: 'get_fine_tuning_job',
  description: `Retrieve the status and details of a fine-tuning job, or list all fine-tuning jobs. Includes training metrics, timestamps, and the resulting fine-tuned model name.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      jobId: z
        .string()
        .optional()
        .describe('Fine-tuning job ID to retrieve. If omitted, lists recent jobs.'),
      limit: z.number().optional().describe('Maximum number of jobs to return when listing'),
      after: z.string().optional().describe('Cursor for pagination when listing jobs')
    })
  )
  .output(
    z.object({
      jobs: z
        .array(
          z.object({
            jobId: z.string().describe('Fine-tuning job ID'),
            model: z.string().describe('Base model being fine-tuned'),
            status: z.string().describe('Current status'),
            createdAt: z.number().describe('Unix timestamp when created'),
            finishedAt: z.number().nullable().describe('Unix timestamp when finished'),
            fineTunedModel: z
              .string()
              .nullable()
              .describe('Name of the resulting fine-tuned model'),
            trainingFileId: z.string().describe('Training file ID'),
            trainedTokens: z.number().nullable().describe('Number of tokens trained on')
          })
        )
        .describe('Fine-tuning jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.jobId) {
      let job = await client.getFineTuningJob(ctx.input.jobId);
      return {
        output: {
          jobs: [
            {
              jobId: job.id,
              model: job.model,
              status: job.status,
              createdAt: job.created_at,
              finishedAt: job.finished_at ?? null,
              fineTunedModel: job.fine_tuned_model ?? null,
              trainingFileId: job.training_file,
              trainedTokens: job.trained_tokens ?? null
            }
          ]
        },
        message: `Fine-tuning job **${job.id}**: status **${job.status}**${job.fine_tuned_model ? `, model: ${job.fine_tuned_model}` : ''}.`
      };
    }

    let result = await client.listFineTuningJobs({
      limit: ctx.input.limit,
      after: ctx.input.after
    });
    let jobs = (result.data ?? []).map((job: any) => ({
      jobId: job.id,
      model: job.model,
      status: job.status,
      createdAt: job.created_at,
      finishedAt: job.finished_at ?? null,
      fineTunedModel: job.fine_tuned_model ?? null,
      trainingFileId: job.training_file,
      trainedTokens: job.trained_tokens ?? null
    }));

    return {
      output: { jobs },
      message: `Found **${jobs.length}** fine-tuning job(s).`
    };
  })
  .build();

export let cancelFineTuningJob = SlateTool.create(spec, {
  name: 'Cancel Fine-Tuning Job',
  key: 'cancel_fine_tuning_job',
  description: `Cancel a running fine-tuning job. The job must be in a cancellable state (e.g. "validating_files" or "running").`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Fine-tuning job ID to cancel')
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Fine-tuning job ID'),
      status: z.string().describe('Updated status of the job')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.cancelFineTuningJob(ctx.input.jobId);

    return {
      output: {
        jobId: result.id,
        status: result.status
      },
      message: `Cancelled fine-tuning job **${result.id}**. Status: ${result.status}.`
    };
  })
  .build();
