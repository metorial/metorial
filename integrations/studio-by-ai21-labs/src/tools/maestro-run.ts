import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { mapRun, runOutputSchema, validateTurns } from '../lib/schemas';
import { spec } from '../spec';

let requirementSchema = z.object({
  name: z.string().describe('Requirement name'),
  description: z.string().describe('Requirement description (max 128 words)'),
  isMandatory: z.boolean().optional().describe('Whether this requirement is mandatory')
});

export let maestroRun = SlateTool.create(spec, {
  name: 'Maestro Run',
  key: 'maestro_run',
  description: `Create a Maestro AI agent run with model selection, compute budget, validation requirements, and optional file or web search. Runs may be asynchronous; use the returned runId with get_maestro_run until the run completes.`,
  constraints: [
    'Up to 10 requirements per run',
    'Requirement descriptions limited to 128 words each'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      input: z
        .union([
          z.string(),
          z.array(
            z.object({
              role: z.enum(['user', 'assistant']).describe('Message role'),
              content: z.string().describe('Message content')
            })
          )
        ])
        .describe('Task input as plain text or an array of conversation messages'),
      systemPrompt: z.string().describe('High-level instruction defining the agent behavior'),
      requirements: z
        .array(requirementSchema)
        .max(10)
        .optional()
        .describe('Validation requirements the output should satisfy'),
      models: z
        .array(z.string())
        .optional()
        .describe(
          'Models to use (e.g. jamba-mini, jamba-large, or third-party model identifiers). Let Maestro select automatically if omitted'
        ),
      budget: z
        .enum(['low', 'medium', 'high'])
        .optional()
        .describe('Compute budget controlling reasoning depth'),
      includeDataSources: z
        .boolean()
        .optional()
        .describe('Include retrieved data sources in the response'),
      includeRequirementsResult: z
        .boolean()
        .optional()
        .describe('Include requirements validation results in the response'),
      responseLanguage: z.string().optional().describe('Desired output language'),
      fileSearch: z
        .object({
          fileIds: z
            .array(z.string())
            .optional()
            .describe('Library file IDs to search; upload_file creates library files'),
          labels: z
            .array(z.string())
            .optional()
            .describe('Search only matching document labels'),
          retrievalStrategy: z.enum(['segments', 'add_neighbors', 'full_doc']).optional(),
          maxNeighbors: z.number().int().min(0).optional()
        })
        .optional()
        .describe('Enable file search over the document library'),
      webSearch: z
        .object({
          urls: z
            .array(z.string().min(1))
            .optional()
            .describe(
              'Optional website prefixes to restrict the search, such as example.com or https://example.com/page'
            )
        })
        .optional()
        .describe('Enable web search')
    })
  )
  .output(runOutputSchema)
  .handleInvocation(async ctx => {
    if (typeof ctx.input.input === 'string') {
      if (!ctx.input.input.trim())
        throw createApiServiceError('Provide a non-empty Maestro input.');
    } else validateTurns(ctx.input.input);
    if (!ctx.input.systemPrompt.trim())
      throw createApiServiceError('Provide a non-empty systemPrompt.');
    if (
      ctx.input.requirements?.some(item => item.description.trim().split(/\s+/).length > 128)
    )
      throw createApiServiceError(
        'Each requirement description must contain no more than 128 words.'
      );
    let client = new Client({ token: ctx.auth.token });

    let include: string[] = [];
    if (ctx.input.includeDataSources) include.push('data_sources');
    if (ctx.input.includeRequirementsResult) include.push('requirements_result');

    let result = await client.createMaestroRun({
      input: ctx.input.input,
      systemPrompt: ctx.input.systemPrompt,
      requirements: ctx.input.requirements,
      models: ctx.input.models,
      budget: ctx.input.budget,
      include: include.length > 0 ? include : undefined,
      responseLanguage: ctx.input.responseLanguage,
      tools: [
        ...(ctx.input.fileSearch
          ? [
              {
                type: 'file_search',
                file_ids: ctx.input.fileSearch.fileIds,
                labels: ctx.input.fileSearch.labels,
                retrieval_strategy: ctx.input.fileSearch.retrievalStrategy,
                max_neighbors: ctx.input.fileSearch.maxNeighbors
              }
            ]
          : []),
        ...(ctx.input.webSearch
          ? [{ type: 'web_search', urls: ctx.input.webSearch.urls }]
          : [])
      ]
    });

    let output = mapRun(result);

    let preview = output.result
      ? output.result.substring(0, 200) + (output.result.length > 200 ? '...' : '')
      : 'No result text';

    return {
      output,
      message: `Maestro run **${output.runId}** has status **${output.status}**.\n\n> ${preview}`
    };
  })
  .build();
