import { SlateTool } from 'slates';
import { z } from 'zod';
import { ExaClient } from '../lib/client';
import { spec } from '../spec';

export let createResearchTool = SlateTool.create(spec, {
  name: 'Create Research',
  key: 'create_research',
  description: `Start an asynchronous in-depth web research task. Exa explores the web, gathers sources, and synthesizes findings into a structured report with citations.
Returns a research ID for polling the status. Use the **Get Research Status** tool to check completion and retrieve results.
Optionally provide an output schema for structured JSON results.`,
  instructions: [
    'Research tasks run asynchronously and may take seconds to minutes depending on complexity.',
    'Use "exa-research-fast" for quicker results, "exa-research" (default) for balanced quality, or "exa-research-pro" for maximum depth.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      instructions: z.string().max(4096).describe('Instructions for what to research'),
      model: z
        .enum(['exa-research-fast', 'exa-research', 'exa-research-pro'])
        .optional()
        .describe('Research model to use (default: exa-research)'),
      outputSchema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON Schema for structured output format')
    })
  )
  .output(
    z.object({
      researchId: z.string().describe('Unique research task identifier for polling'),
      status: z
        .string()
        .describe('Current status: pending, running, completed, failed, or canceled'),
      createdAt: z.number().describe('Creation timestamp in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);

    let response = await client.createResearch({
      instructions: ctx.input.instructions,
      model: ctx.input.model,
      outputSchema: ctx.input.outputSchema
    });

    return {
      output: {
        researchId: response.researchId,
        status: response.status,
        createdAt: response.createdAt
      },
      message: `Research task **${response.researchId}** created with status: **${response.status}**. Poll with Get Research Status to retrieve results.`
    };
  })
  .build();

export let getResearchTool = SlateTool.create(spec, {
  name: 'Get Research Status',
  key: 'get_research_status',
  description: `Check the status of an asynchronous research task and retrieve its results when completed.
Returns the current status, and when completed, the full research output with content and cost information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      researchId: z.string().describe('The research task ID returned by Create Research')
    })
  )
  .output(
    z.object({
      researchId: z.string().describe('Research task identifier'),
      status: z
        .string()
        .describe('Current status: pending, running, completed, failed, or canceled'),
      content: z
        .string()
        .optional()
        .describe('Research output content (available when completed)'),
      parsedOutput: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Structured output if an output schema was provided'),
      error: z.string().optional().describe('Error message if the task failed'),
      costTotal: z.number().optional().describe('Total cost in USD'),
      finishedAt: z.number().optional().describe('Completion timestamp in milliseconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ExaClient(ctx.auth.token);

    let response = await client.getResearch(ctx.input.researchId);

    return {
      output: {
        researchId: response.researchId,
        status: response.status,
        content: response.output?.content,
        parsedOutput: response.output?.parsed,
        error: response.error,
        costTotal: response.costDollars?.total,
        finishedAt: response.finishedAt
      },
      message: `Research **${response.researchId}** is **${response.status}**.${response.status === 'completed' ? ' Results are available.' : ''}`
    };
  })
  .build();
