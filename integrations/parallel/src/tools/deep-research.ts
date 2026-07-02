import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deepResearch = SlateTool.create(spec, {
  name: 'Deep Research',
  key: 'deep_research',
  description: `Run a complex, multi-step web research task that autonomously searches, retrieves, reasons, and synthesizes information. Declare what information you need and the API orchestrates querying, ranking, retrieval, reasoning, validation, and synthesis.
Returns a run ID that can be used with the **Get Task Run** tool to check status and retrieve results when complete.`,
  instructions: [
    'Use the outputSchema to get structured JSON results with defined fields.',
    'Higher processor tiers (pro, ultra) perform deeper research but take longer and cost more.',
    'The fast variants (pro-fast, ultra-fast) trade some quality for speed.',
    'Input should be under 15,000 characters for optimal performance.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      input: z
        .union([z.string(), z.record(z.string(), z.unknown())])
        .describe('Research task prompt — a natural language description or structured input'),
      processor: z
        .enum([
          'lite',
          'base',
          'core',
          'pro',
          'ultra',
          'lite-fast',
          'base-fast',
          'core-fast',
          'pro-fast',
          'ultra-fast'
        ])
        .describe(
          'Processor tier controlling thoroughness vs speed. Higher tiers are more thorough but slower.'
        ),
      outputSchema: z
        .union([z.string(), z.record(z.string(), z.unknown())])
        .optional()
        .describe('JSON schema or "auto" to get structured output in a specific format'),
      inputSchema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Optional JSON schema describing the input format'),
      metadata: z
        .record(z.string(), z.string())
        .optional()
        .describe(
          'Key-value metadata to attach to the run (key max 16 chars, value max 512 chars)'
        ),
      sourcePolicy: z
        .object({
          includeDomains: z
            .array(z.string())
            .optional()
            .describe('Only use sources from these domains'),
          excludeDomains: z
            .array(z.string())
            .optional()
            .describe('Exclude sources from these domains'),
          afterDate: z
            .string()
            .optional()
            .describe('Only use sources published after this date (YYYY-MM-DD)')
        })
        .optional()
        .describe('Control which sources are used for research')
    })
  )
  .output(
    z.object({
      runId: z
        .string()
        .describe('Unique run ID — use with Get Task Run to check status and get results'),
      interactionId: z.string().describe('Interaction ID for follow-up tasks'),
      status: z.string().describe('Current status: queued, running, completed, or failed'),
      isActive: z.boolean().describe('Whether the run is still active'),
      processor: z.string().describe('Processor tier used'),
      metadata: z.record(z.string(), z.string()).nullable().describe('Attached metadata'),
      createdAt: z.string().describe('Timestamp when the run was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let taskSpec:
      | {
          outputSchema?: string | Record<string, unknown>;
          inputSchema?: Record<string, unknown>;
        }
      | undefined;
    if (ctx.input.outputSchema || ctx.input.inputSchema) {
      taskSpec = {};
      if (ctx.input.outputSchema) taskSpec.outputSchema = ctx.input.outputSchema;
      if (ctx.input.inputSchema) taskSpec.inputSchema = ctx.input.inputSchema;
    }

    let run = await client.createTaskRun({
      input: ctx.input.input,
      processor: ctx.input.processor,
      taskSpec,
      metadata: ctx.input.metadata,
      sourcePolicy: ctx.input.sourcePolicy
    });

    return {
      output: {
        runId: run.runId,
        interactionId: run.interactionId,
        status: run.status,
        isActive: run.isActive,
        processor: run.processor,
        metadata: run.metadata,
        createdAt: run.createdAt
      },
      message: `Deep research task created with run ID **${run.runId}** using processor **${run.processor}**. Status: **${run.status}**. Use the "Get Task Run" tool to check progress and retrieve results.`
    };
  })
  .build();
