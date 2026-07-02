import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import {
  ensureInteractInput,
  normalizePageData,
  pageDataSchema,
  parseMaybeJson
} from './shared';

export let getScrapeStatusTool = SlateTool.create(spec, {
  name: 'Get Scrape Status',
  key: 'get_scrape_status',
  description: `Retrieve the status and result data for a Firecrawl scrape job by scrape ID. Use the scrapeId from Scrape Page metadata.`,
  instructions: ['Provide the scrapeId returned by Scrape Page.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scrapeId: z.string().describe('Scrape job ID from scrape_page output')
    })
  )
  .output(
    pageDataSchema.extend({
      status: z.string().optional().describe('Current scrape status'),
      success: z
        .boolean()
        .optional()
        .describe('Whether Firecrawl marked the request successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getScrapeStatus(ctx.input.scrapeId);
    let data = result.data ?? result;

    return {
      output: {
        ...normalizePageData(data),
        status: result.status,
        success: result.success
      },
      message: `Scrape job \`${ctx.input.scrapeId}\` is **${result.status ?? 'available'}**.`
    };
  });

export let interactWithPageTool = SlateTool.create(spec, {
  name: 'Interact With Page',
  key: 'interact_with_page',
  description: `Continue interacting with the browser state from a prior Firecrawl scrape. Execute Node, Python, or bash code, or provide a natural-language prompt for Firecrawl's page interaction agent.`,
  instructions: [
    'First call Scrape Page and use the returned scrapeId.',
    'Provide exactly one of code or prompt.',
    'Call Stop Page Interaction when the browser session is no longer needed.'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      scrapeId: z.string().describe('Scrape job ID from scrape_page output'),
      code: z.string().optional().describe('Code to execute in the scrape-bound browser'),
      prompt: z.string().optional().describe('Natural-language task for Firecrawl agent'),
      language: z
        .enum(['python', 'node', 'bash'])
        .optional()
        .describe('Language for code execution'),
      timeout: z.number().optional().describe('Execution timeout in seconds'),
      origin: z.string().optional().describe('Optional origin label for telemetry')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether execution completed successfully'),
      liveViewUrl: z.string().optional().describe('Read-only live browser view URL'),
      interactiveLiveViewUrl: z
        .string()
        .optional()
        .describe('Interactive live browser view URL'),
      output: z
        .string()
        .nullable()
        .optional()
        .describe('Agent final response for prompt mode'),
      stdout: z.string().nullable().optional().describe('Standard output from code execution'),
      stderr: z.string().nullable().optional().describe('Standard error from code execution'),
      result: z.any().optional().describe('Parsed result if JSON, otherwise raw result'),
      exitCode: z.number().nullable().optional().describe('Process exit code'),
      killed: z.boolean().optional().describe('Whether execution timed out'),
      error: z.string().nullable().optional().describe('Execution error')
    })
  )
  .handleInvocation(async ctx => {
    ensureInteractInput(ctx.input);

    let client = new Client({ token: ctx.auth.token });
    let result = await client.interactWithScrape(ctx.input.scrapeId, {
      code: ctx.input.code,
      prompt: ctx.input.prompt,
      language: ctx.input.language,
      timeout: ctx.input.timeout,
      origin: ctx.input.origin
    });

    return {
      output: {
        success: result.success,
        liveViewUrl: result.liveViewUrl,
        interactiveLiveViewUrl: result.interactiveLiveViewUrl,
        output: result.output,
        stdout: result.stdout,
        stderr: result.stderr,
        result: parseMaybeJson(result.result),
        exitCode: result.exitCode,
        killed: result.killed,
        error: result.error
      },
      message: `Interacted with scrape job \`${ctx.input.scrapeId}\`.`
    };
  });

export let stopPageInteractionTool = SlateTool.create(spec, {
  name: 'Stop Page Interaction',
  key: 'stop_page_interaction',
  description: `Stop the interactive browser session associated with a Firecrawl scrape job.`,
  instructions: ['Provide the scrapeId whose interaction session should be stopped.'],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      scrapeId: z.string().describe('Scrape job ID with an active interaction session')
    })
  )
  .output(
    z.object({
      success: z.boolean().optional().describe('Whether the interaction session stopped')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.stopScrapeInteraction(ctx.input.scrapeId);

    return {
      output: {
        success: result.success
      },
      message: `Stopped interaction session for scrape job \`${ctx.input.scrapeId}\`.`
    };
  });
