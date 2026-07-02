import { SlateTool } from 'slates';
import { z } from 'zod';
import { MistralClient } from '../lib/client';
import { spec } from '../spec';

let jobSchema = z.object({
  jobId: z.string().describe('Fine-tuning job ID'),
  status: z
    .string()
    .describe(
      'Job status (QUEUED, STARTED, VALIDATING, VALIDATED, RUNNING, FAILED_VALIDATION, FAILED, SUCCESS, CANCELLED, CANCELLATION_REQUESTED)'
    ),
  model: z.string().describe('Base model being fine-tuned'),
  fineTunedModel: z
    .string()
    .nullable()
    .optional()
    .describe('Resulting fine-tuned model ID (available after success)'),
  createdAt: z.number().optional().describe('Job creation timestamp'),
  modifiedAt: z.number().optional().describe('Last modification timestamp'),
  trainingFiles: z.array(z.string()).optional().describe('Training file IDs'),
  validationFiles: z.array(z.string()).optional().describe('Validation file IDs'),
  hyperparameters: z.any().optional().describe('Training hyperparameters'),
  suffix: z.string().optional().describe('Custom model name suffix'),
  autoStart: z.boolean().optional().describe('Whether the job auto-starts')
});

export let createFineTuningJobTool = SlateTool.create(spec, {
  name: 'Create Fine-Tuning Job',
  key: 'create_fine_tuning_job',
  description: `Create a fine-tuning job to customize a Mistral model on your training data. Upload JSONL training files first using the file management tools, then reference their IDs here. Supports configurable hyperparameters including learning rate, training steps, and epochs.`,
  instructions: [
    'Training files must be uploaded first and referenced by their file IDs.',
    'Use dryRun=true to validate the job configuration without starting training.',
    'Monitor job progress using the Get Fine-Tuning Job tool.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe(
          'Base model to fine-tune (e.g., "open-mistral-nemo", "mistral-small-latest")'
        ),
      trainingFiles: z
        .array(
          z.object({
            fileId: z.string().describe('Training file ID'),
            weight: z.number().optional().describe('File weight in training')
          })
        )
        .describe('Training data file references'),
      validationFiles: z.array(z.string()).optional().describe('Validation file IDs'),
      hyperparameters: z
        .object({
          trainingSteps: z.number().optional().describe('Number of training steps'),
          learningRate: z.number().optional().describe('Learning rate'),
          warmupFraction: z.number().optional().describe('Warmup fraction of total steps'),
          weightDecay: z.number().optional().describe('Weight decay'),
          epochs: z.number().optional().describe('Number of training epochs'),
          fimRatio: z
            .number()
            .optional()
            .describe('Fill-in-the-middle ratio (for code models)'),
          seqLen: z.number().optional().describe('Sequence length')
        })
        .optional()
        .describe('Training hyperparameters'),
      suffix: z.string().optional().describe('Custom suffix for the fine-tuned model name'),
      dryRun: z
        .boolean()
        .optional()
        .describe('Validate configuration without starting training'),
      autoStart: z.boolean().optional().describe('Automatically start the job when created')
    })
  )
  .output(jobSchema)
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.createFineTuningJob({
      model: ctx.input.model,
      trainingFiles: ctx.input.trainingFiles,
      validationFiles: ctx.input.validationFiles,
      hyperparameters: ctx.input.hyperparameters,
      suffix: ctx.input.suffix,
      dryRun: ctx.input.dryRun,
      autoStart: ctx.input.autoStart
    });

    return {
      output: {
        jobId: result.id,
        status: result.status,
        model: result.model,
        fineTunedModel: result.fine_tuned_model,
        createdAt: result.created_at,
        modifiedAt: result.modified_at,
        trainingFiles: result.training_files?.map((f: any) => f.file_id || f),
        validationFiles: result.validation_files,
        hyperparameters: result.hyperparameters,
        suffix: result.suffix,
        autoStart: result.auto_start
      },
      message: `Created fine-tuning job **${result.id}** with status **${result.status}** on model **${result.model}**.`
    };
  })
  .build();

export let getFineTuningJobTool = SlateTool.create(spec, {
  name: 'Get Fine-Tuning Job',
  key: 'get_fine_tuning_job',
  description: `Retrieve the current status and details of a fine-tuning job. Use this to monitor training progress, check for completion, or get the resulting fine-tuned model ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Fine-tuning job ID')
    })
  )
  .output(jobSchema)
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.getFineTuningJob(ctx.input.jobId);

    return {
      output: {
        jobId: result.id,
        status: result.status,
        model: result.model,
        fineTunedModel: result.fine_tuned_model,
        createdAt: result.created_at,
        modifiedAt: result.modified_at,
        trainingFiles: result.training_files?.map((f: any) => f.file_id || f),
        validationFiles: result.validation_files,
        hyperparameters: result.hyperparameters,
        suffix: result.suffix,
        autoStart: result.auto_start
      },
      message: `Fine-tuning job **${result.id}**: status **${result.status}**${result.fine_tuned_model ? `, fine-tuned model: **${result.fine_tuned_model}**` : ''}.`
    };
  })
  .build();

export let listFineTuningJobsTool = SlateTool.create(spec, {
  name: 'List Fine-Tuning Jobs',
  key: 'list_fine_tuning_jobs',
  description: `List all fine-tuning jobs in your workspace. Returns job statuses, models, and configuration details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (0-based)'),
      pageSize: z.number().optional().describe('Number of jobs per page')
    })
  )
  .output(
    z.object({
      jobs: z.array(jobSchema).describe('Fine-tuning jobs'),
      total: z.number().optional().describe('Total number of jobs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.listFineTuningJobs({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    let jobs = (result.data || []).map((j: any) => ({
      jobId: j.id,
      status: j.status,
      model: j.model,
      fineTunedModel: j.fine_tuned_model,
      createdAt: j.created_at,
      modifiedAt: j.modified_at,
      trainingFiles: j.training_files?.map((f: any) => f.file_id || f),
      validationFiles: j.validation_files,
      hyperparameters: j.hyperparameters,
      suffix: j.suffix,
      autoStart: j.auto_start
    }));

    return {
      output: {
        jobs,
        total: result.total
      },
      message: `Found **${jobs.length}** fine-tuning job(s).`
    };
  })
  .build();

export let cancelFineTuningJobTool = SlateTool.create(spec, {
  name: 'Cancel Fine-Tuning Job',
  key: 'cancel_fine_tuning_job',
  description: `Cancel a running or queued fine-tuning job. Cannot cancel already completed or failed jobs.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      jobId: z.string().describe('Fine-tuning job ID to cancel')
    })
  )
  .output(jobSchema)
  .handleInvocation(async ctx => {
    let client = new MistralClient(ctx.auth.token);

    let result = await client.cancelFineTuningJob(ctx.input.jobId);

    return {
      output: {
        jobId: result.id,
        status: result.status,
        model: result.model,
        fineTunedModel: result.fine_tuned_model,
        createdAt: result.created_at,
        modifiedAt: result.modified_at,
        trainingFiles: result.training_files?.map((f: any) => f.file_id || f),
        validationFiles: result.validation_files,
        hyperparameters: result.hyperparameters,
        suffix: result.suffix,
        autoStart: result.auto_start
      },
      message: `Cancelled fine-tuning job **${result.id}**. Status: **${result.status}**.`
    };
  })
  .build();
