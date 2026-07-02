import { SlateTool } from 'slates';
import { z } from 'zod';
import { HyperbrowserClient } from '../lib/client';
import { sessionOptionsSchema } from '../lib/schemas';
import { spec } from '../spec';

export let extractData = SlateTool.create(spec, {
  name: 'Extract Structured Data',
  key: 'extract_data',
  description: `Use AI to extract specific structured data from one or more webpages.
Provide URLs and a natural language prompt describing what data to extract, and optionally a JSON schema for the output structure.
The AI transforms unstructured web content into structured data matching your requirements.`,
  instructions: [
    'Provide at least a prompt or a schema (or both for best results).',
    'The prompt describes what data to extract in natural language.',
    'The schema is a JSON Schema object that defines the exact output structure.',
    'Use maxLinks to follow and extract from linked pages.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      urls: z.array(z.string()).describe('URLs to extract data from'),
      prompt: z
        .string()
        .optional()
        .describe('Natural language instructions describing what data to extract'),
      systemPrompt: z.string().optional().describe('System prompt for the extraction LLM'),
      schema: z
        .record(z.string(), z.any())
        .optional()
        .describe('JSON Schema defining the desired output structure'),
      maxLinks: z
        .number()
        .optional()
        .describe('Maximum number of linked pages to follow and extract from'),
      waitFor: z
        .number()
        .optional()
        .describe('Wait time in ms before extraction (default: 0)'),
      sessionOptions: sessionOptionsSchema
    })
  )
  .output(
    z.object({
      jobId: z.string().describe('Extract job identifier'),
      status: z.string().describe('Job status'),
      extractedData: z
        .any()
        .optional()
        .describe('Extracted structured data matching the schema'),
      metadata: z
        .object({
          inputTokens: z.number().optional().nullable().describe('Input tokens used'),
          outputTokens: z.number().optional().nullable().describe('Output tokens used'),
          numPagesScraped: z.number().optional().nullable().describe('Number of pages scraped')
        })
        .optional()
        .nullable()
        .describe('Extraction metadata'),
      error: z.string().optional().describe('Error message if job failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HyperbrowserClient({ token: ctx.auth.token });

    let params: Record<string, unknown> = { urls: ctx.input.urls };
    if (ctx.input.prompt) params.prompt = ctx.input.prompt;
    if (ctx.input.systemPrompt) params.systemPrompt = ctx.input.systemPrompt;
    if (ctx.input.schema) params.schema = ctx.input.schema;
    if (ctx.input.maxLinks !== undefined) params.maxLinks = ctx.input.maxLinks;
    if (ctx.input.waitFor !== undefined) params.waitFor = ctx.input.waitFor;
    if (ctx.input.sessionOptions) params.sessionOptions = ctx.input.sessionOptions;

    ctx.info(`Starting extract job for ${ctx.input.urls.length} URLs`);
    let startResponse = await client.startExtractJob(params);
    let jobId = startResponse.jobId;

    ctx.progress('Waiting for extract job to complete...');
    let result = await client.pollForCompletion(
      () => client.getExtractJobStatus(jobId),
      () => client.getExtractJobResult(jobId)
    );

    let metadata = result.metadata as Record<string, unknown> | null | undefined;

    return {
      output: {
        jobId,
        status: result.status as string,
        extractedData: result.data,
        metadata: metadata
          ? {
              inputTokens: metadata.inputTokens as number | null | undefined,
              outputTokens: metadata.outputTokens as number | null | undefined,
              numPagesScraped: metadata.numPagesScraped as number | null | undefined
            }
          : undefined,
        error: result.error as string | undefined
      },
      message: `Extraction completed for **${ctx.input.urls.length}** URL(s). Status: **${result.status}**`
    };
  })
  .build();
