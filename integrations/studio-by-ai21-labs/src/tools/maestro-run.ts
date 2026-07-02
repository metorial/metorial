import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let requirementSchema = z.object({
  name: z.string().describe('Requirement name'),
  description: z.string().describe('Requirement description (max 128 words)'),
  isMandatory: z.boolean().optional().describe('Whether this requirement is mandatory')
});

export let maestroRun = SlateTool.create(spec, {
  name: 'Maestro Run',
  key: 'maestro_run',
  description: `Create and execute a Maestro AI agent run. Maestro is an AI orchestration system that can search, reason, validate, and adapt in real time. Supports model selection (AI21 or third-party), compute budget control, requirements validation, and tool integration including file search and web search.`,
  constraints: [
    'Up to 10 requirements per run',
    'Requirement descriptions limited to 128 words each'
  ],
  tags: {
    readOnly: true,
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
      responseLanguage: z.string().optional().describe('Desired output language')
    })
  )
  .output(
    z.object({
      result: z.string().optional().describe('Generated output text'),
      status: z.string().optional().describe('Run completion status'),
      requirementsResult: z
        .any()
        .optional()
        .describe('Per-requirement validation scores and overall score'),
      dataSources: z
        .array(z.any())
        .optional()
        .describe('Retrieved data sources used in the response')
    })
  )
  .handleInvocation(async ctx => {
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
      responseLanguage: ctx.input.responseLanguage
    });

    let output = {
      result: result.result ?? result.output,
      status: result.status,
      requirementsResult: result.requirements_result,
      dataSources: result.data_sources
    };

    let preview = output.result
      ? output.result.substring(0, 200) + (output.result.length > 200 ? '...' : '')
      : 'No result text';

    return {
      output,
      message: `Maestro run completed with status **${output.status ?? 'unknown'}**.\n\n> ${preview}`
    };
  })
  .build();
