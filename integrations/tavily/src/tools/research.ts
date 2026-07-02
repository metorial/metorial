import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let research = SlateTool.create(spec, {
  name: 'Research',
  key: 'research',
  description: `Conduct in-depth, multi-step research on a topic. Tavily autonomously performs multiple searches, analyzes sources, and produces a comprehensive research report with citations. The task is queued asynchronously - this tool creates the research task and polls until it completes or times out.`,
  instructions: [
    'Use "mini" model for fast, focused research on narrow questions.',
    'Use "pro" model for comprehensive, multi-angle research on complex topics.',
    'Use "auto" to let Tavily choose the best model based on the query.',
    'Provide an outputSchema as a JSON Schema object to get structured output.'
  ],
  constraints: [
    'Research tasks run asynchronously and may take significant time to complete.',
    'The tool polls for up to 5 minutes before returning the current status.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
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
      responseTime: z.number().describe('Time elapsed in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let created = await client.createResearch({
      input: ctx.input.query,
      model: ctx.input.model,
      outputSchema: ctx.input.outputSchema,
      citationFormat: ctx.input.citationFormat
    });

    ctx.info(`Research task created: ${created.requestId}`);

    let maxAttempts = 60;
    let pollIntervalMs = 5000;
    let result = await client.getResearch(created.requestId);

    for (
      let i = 0;
      i < maxAttempts && (result.status === 'pending' || result.status === 'in_progress');
      i++
    ) {
      ctx.progress(`Research ${result.status}... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
      result = await client.getResearch(created.requestId);
    }

    let isComplete = result.status === 'completed';
    let isFailed = result.status === 'failed';
    let sourceCount = result.sources?.length ?? 0;

    return {
      output: {
        requestId: result.requestId,
        status: result.status,
        content: result.content,
        sources: result.sources,
        createdAt: result.createdAt,
        responseTime: result.responseTime
      },
      message: isComplete
        ? `Research completed with **${sourceCount} source${sourceCount !== 1 ? 's' : ''}** in ${result.responseTime}s.`
        : isFailed
          ? `Research task **failed** (ID: ${result.requestId}).`
          : `Research task is still **${result.status}** (ID: ${result.requestId}). You can check the status later.`
    };
  })
  .build();
