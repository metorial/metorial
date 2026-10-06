import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireValue, upstream } from '../lib/contracts';
import { spec } from '../spec';

export let research = SlateTool.create(spec, {
  name: 'Research',
  key: 'research',
  description: `Conduct in-depth, multi-step research on a topic. Tavily autonomously performs multiple searches, analyzes sources, and produces a comprehensive research report with citations. Creates a billable, persistent asynchronous task. Optionally waits for a bounded period; retain the request ID to resume status reads without creating another task.`,
  instructions: [
    'Use "mini" model for fast, focused research on narrow questions.',
    'Use "pro" model for comprehensive, multi-angle research on complex topics.',
    'Use "auto" to let Tavily choose the best model based on the query.',
    'Provide an outputSchema as a JSON Schema object to get structured output.'
  ],
  constraints: [
    'Research tasks run asynchronously and may take significant time to complete.',
    'Waiting is bounded to at most 5 minutes; failed polling does not cancel or undo an accepted job.',
    'The public API has no documented cancellation or deletion route. Credits and research history may remain.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      waitForCompletion: z
        .boolean()
        .optional()
        .describe(
          'Wait for completion by default. Set false to return the accepted request immediately.'
        ),
      maxWaitSeconds: z
        .number()
        .min(0)
        .max(300)
        .optional()
        .describe(
          'Maximum wait after creation, in seconds (0-300; default 300). Does not cancel the job.'
        ),
      query: z.string().describe('The research task or question to investigate'),
      model: z
        .enum(['mini', 'pro', 'auto'])
        .optional()
        .describe('Research model to use. Defaults to "auto"'),
      outputSchema: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('JSON Schema defining the desired structure for the research output'),
      citationFormat: z
        .enum(['numbered', 'mla', 'apa', 'chicago'])
        .optional()
        .describe('Citation format style. Defaults to "numbered"')
    })
  )
  .output(
    z.object({
      requestId: z.string().describe('Unique research task identifier'),
      status: z.string().describe('Task status: pending, in_progress, completed, or failed'),
      content: z
        .unknown()
        .optional()
        .describe(
          'Research report content (string or structured object if outputSchema was provided)'
        ),
      sources: z
        .array(
          z.object({
            title: z.string().describe('Source title'),
            url: z.string().describe('Source URL'),
            favicon: z.string().optional().describe('Source favicon URL')
          })
        )
        .optional()
        .describe('Sources cited in the research report'),
      createdAt: z.string().optional().describe('Timestamp when the task was created'),
      pollingError: z
        .string()
        .optional()
        .describe(
          'Status could not be confirmed; resume the same request ID before retrying creation'
        ),
      usageCredits: z.number().optional().describe('Native credits when reported'),
      responseTime: z.number().describe('Time elapsed in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    const wait = ctx.input.waitForCompletion !== false;
    const seconds = ctx.input.maxWaitSeconds ?? 300;
    requireValue(
      Number.isFinite(seconds) && seconds >= 0 && seconds <= 300,
      'Wait must be between 0 and 300 seconds.'
    );
    let created: Awaited<ReturnType<Client['createResearch']>>;
    try {
      created = await client.createResearch({
        input: ctx.input.query,
        model: ctx.input.model,
        outputSchema: ctx.input.outputSchema,
        citationFormat: ctx.input.citationFormat
      });
    } catch (error) {
      const safe = upstream(error);
      safe.data.reason =
        `${safe.data.reason ?? ''} Research creation could not be confirmed. A job may have been accepted and charges/history may remain. Reconcile native research history before creating a replacement; do not retry blindly.`.trim();
      throw safe;
    }

    let result: Awaited<ReturnType<Client['getResearch']>> = created;
    let pollingError: string | undefined;
    const deadline = Date.now() + seconds * 1000;
    if (wait && seconds > 0) {
      for (let attempt = 0; attempt < 61; attempt++) {
        if (attempt > 0) {
          const remaining = deadline - Date.now();
          if (remaining <= 0) break;
          await new Promise(resolve => setTimeout(resolve, Math.min(5000, remaining)));
          if (Date.now() >= deadline) break;
        }
        try {
          result = await client.getResearch(
            created.requestId,
            Math.max(1, Math.min(30000, deadline - Date.now()))
          );
        } catch {
          pollingError =
            'Status could not be confirmed. Resume this request ID with Get Research; the job may continue and credits may remain. Do not create a replacement blindly.';
          break;
        }
        if (result.status === 'completed' || result.status === 'failed') break;
        ctx.progress(`Research is ${result.status}.`);
      }
    }
    return {
      output: {
        requestId: result.requestId,
        status: result.status,
        content: result.content,
        sources: result.sources,
        createdAt: result.createdAt,
        responseTime: result.responseTime,
        usageCredits: result.usageCredits,
        pollingError
      },
      message:
        pollingError ??
        (result.status === 'completed'
          ? `Research completed with ${result.sources?.length ?? 0} sources.`
          : `Research request ${result.requestId} is ${result.status}. Resume this ID with Get Research; creating another request may consume more credits.`)
    };
  })
  .build();
