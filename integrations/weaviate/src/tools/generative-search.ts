import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let generativeSearch = SlateTool.create(spec, {
  name: 'Generative Search (RAG)',
  key: 'generative_search',
  description: `Perform Retrieval Augmented Generation (RAG) by searching a collection and prompting an LLM with the retrieved results. Requires a generative module configured on the collection.

Two generation modes:
- **Single prompt**: Generates a response for each result individually, using object properties via \`{propertyName}\` template syntax.
- **Grouped task**: Generates one response from all results combined, using all or selected properties as context.`,
  instructions: [
    'The collection must have a generative module configured (e.g. generative-openai).',
    'Provide either singlePrompt or groupedTask, or both.',
    'In singlePrompt, reference object properties using {propertyName} syntax.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      collectionName: z.string().describe('Name of the collection to search'),
      properties: z.array(z.string()).describe('Properties to return in results'),
      searchQuery: z.string().describe('Natural language search query (uses nearText)'),
      limit: z.number().optional().describe('Maximum number of results for the search'),
      where: z.any().optional().describe('Where filter for scalar conditions'),
      tenant: z.string().optional().describe('Tenant name for multi-tenant collections'),
      singlePrompt: z
        .string()
        .optional()
        .describe(
          'Prompt template for per-object generation. Use {propertyName} to reference properties.'
        ),
      groupedTask: z
        .string()
        .optional()
        .describe('Prompt for combined generation across all results'),
      groupedProperties: z
        .array(z.string())
        .optional()
        .describe('Properties to include as context for grouped task (defaults to all)')
    })
  )
  .output(
    z.object({
      objects: z
        .array(
          z.object({
            properties: z.record(z.string(), z.any()).describe('Object properties'),
            singleResult: z.string().optional().describe('Generated text for this object'),
            generationError: z.string().optional().describe('Generation error for this object')
          })
        )
        .describe('Search results with generation'),
      groupedResult: z.string().optional().describe('Generated text from grouped task'),
      groupedError: z.string().optional().describe('Error from grouped task generation'),
      totalResults: z.number().describe('Number of results returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let {
      collectionName,
      properties,
      searchQuery,
      limit,
      where,
      tenant,
      singlePrompt,
      groupedTask,
      groupedProperties
    } = ctx.input;

    let args: string[] = [`nearText: { concepts: ${JSON.stringify([searchQuery])} }`];
    if (limit !== undefined) args.push(`limit: ${limit}`);
    if (where) {
      args.push(`where: ${JSON.stringify(where).replace(/"(\w+)":/g, '$1:')}`);
    }
    if (tenant) args.push(`tenant: "${tenant}"`);

    let argsStr = `(${args.join(', ')})`;

    // Build generate directive
    let generateParts: string[] = [];
    if (singlePrompt) {
      generateParts.push(`singleResult: { prompt: ${JSON.stringify(singlePrompt)} }`);
    }
    if (groupedTask) {
      let taskParts: string[] = [`task: ${JSON.stringify(groupedTask)}`];
      if (groupedProperties && groupedProperties.length > 0) {
        taskParts.push(`properties: ${JSON.stringify(groupedProperties)}`);
      }
      generateParts.push(`groupedResult: { ${taskParts.join(', ')} }`);
    }

    let generateStr =
      generateParts.length > 0
        ? `generate(${generateParts.join(', ')}) { singleResult groupedResult error }`
        : '';

    let propsStr = properties.join('\n          ');

    let query = `{
      Get {
        ${collectionName}${argsStr} {
          ${propsStr}
          _additional {
            id
            ${generateStr}
          }
        }
      }
    }`;

    let result = await client.graphql(query);

    if (result.errors && result.errors.length > 0) {
      throw new Error(`GraphQL error: ${result.errors.map((e: any) => e.message).join(', ')}`);
    }

    let rawObjects = result.data?.Get?.[collectionName] || [];
    let groupedResult: string | undefined;
    let groupedError: string | undefined;

    let objects = rawObjects.map((obj: any) => {
      let { _additional, ...props } = obj;
      let gen = _additional?.generate;

      // The grouped result is the same on all objects; take from first
      if (gen?.groupedResult && !groupedResult) {
        groupedResult = gen.groupedResult;
      }
      if (gen?.error && !groupedError && !gen?.singleResult) {
        groupedError = gen.error;
      }

      return {
        properties: props,
        singleResult: gen?.singleResult || undefined,
        generationError: gen?.singleResult ? undefined : gen?.error || undefined
      };
    });

    return {
      output: {
        objects,
        groupedResult,
        groupedError,
        totalResults: objects.length
      },
      message: `RAG search returned **${objects.length}** result(s) from **${collectionName}**.${groupedResult ? ' Grouped generation completed.' : ''}`
    };
  })
  .build();
