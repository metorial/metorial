import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let sourceSchema = z.object({
  title: z.string().optional().describe('Title of the source'),
  url: z.string().optional().describe('URL of the source'),
  snippet: z.string().optional().describe('Snippet from the source')
});

let imageSchema = z.object({
  url: z.string().optional().describe('URL of the image'),
  description: z.string().optional().describe('Description of the image')
});

export let customSearch = SlateTool.create(spec, {
  name: 'Custom Search',
  key: 'custom_search',
  description: `Perform a web search with custom system and user prompts, giving full control over how the LLM processes search results.
Useful for tailored use cases such as summarization, structured extraction, analysis, or domain-specific formatting of search results.
The system prompt controls the LLM's behavior, while the user prompt drives the web search query.`,
  instructions: [
    'The userPrompt is used for the web search — make it specific and focused on what to search for.',
    'The systemPrompt controls how the LLM responds — use it to define output format, tone, or analysis approach.',
    'Adjust temperature (0-1) to control response randomness: lower for factual, higher for creative.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      systemPrompt: z
        .string()
        .describe('System prompt to guide the LLM behavior and response format'),
      userPrompt: z.string().describe('User prompt used to perform the web search'),
      model: z
        .enum(['gpt-4o-mini', 'gpt-4o', 'o3-mini-high', 'o3-mini-medium', 'gemini-2.0-flash'])
        .optional()
        .describe('LLM model to use'),
      location: z
        .string()
        .optional()
        .describe('Country code for localized results (e.g. "us", "gb", "jp")'),
      responseLanguage: z
        .string()
        .optional()
        .describe('Language code for the response, or "auto" to detect from query'),
      searchType: z.enum(['general', 'news']).optional().describe('Type of search to perform'),
      temperature: z
        .number()
        .min(0)
        .max(1)
        .optional()
        .describe('Randomness of the response (0 = deterministic, 1 = creative)'),
      topP: z.number().min(0).max(1).optional().describe('Nucleus sampling threshold'),
      recencyFilter: z
        .enum(['hour', 'day', 'week', 'month', 'year', 'anytime'])
        .optional()
        .describe('Filter results by recency'),
      returnSources: z
        .boolean()
        .optional()
        .describe('Include source references in the response'),
      returnImages: z.boolean().optional().describe('Include relevant images in the response')
    })
  )
  .output(
    z.object({
      llmResponse: z.string().describe('The AI-generated response based on custom prompts'),
      sources: z.array(sourceSchema).optional().describe('List of sources used'),
      images: z.array(imageSchema).optional().describe('List of relevant images found'),
      responseTime: z
        .number()
        .optional()
        .describe('Time taken to generate the response in seconds')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.customSearch({
      systemPrompt: ctx.input.systemPrompt,
      userPrompt: ctx.input.userPrompt,
      model: ctx.input.model,
      location: ctx.input.location,
      responseLanguage: ctx.input.responseLanguage,
      searchType: ctx.input.searchType,
      temperature: ctx.input.temperature,
      topP: ctx.input.topP,
      recencyFilter: ctx.input.recencyFilter,
      returnSources: ctx.input.returnSources,
      returnImages: ctx.input.returnImages
    });

    let sourcesCount = result.sources?.length ?? 0;
    let extras = [
      sourcesCount > 0 ? `${sourcesCount} source(s)` : null,
      result.responseTime ? `${result.responseTime}s` : null
    ]
      .filter(Boolean)
      .join(', ');

    return {
      output: result,
      message: `Custom search completed for "${ctx.input.userPrompt}"${extras ? ` — ${extras}` : ''}.`
    };
  })
  .build();
