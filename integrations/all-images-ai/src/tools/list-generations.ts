import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listGenerations = SlateTool.create(spec, {
  name: 'List Generations',
  key: 'list_generations',
  description: `List image generations with optional filtering by name or tag. Supports pagination. Returns generation details including status, prompt, and images.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      name: z.string().optional().describe('Filter generations by name'),
      tag: z.string().optional().describe('Filter generations by tag'),
      limit: z.number().optional().describe('Number of results per page'),
      offset: z.number().optional().describe('Starting position for pagination')
    })
  )
  .output(
    z.object({
      filteredResults: z.number().describe('Total number of matching generations'),
      generations: z
        .array(
          z.object({
            generationId: z.string().describe('Generation ID'),
            name: z.string().describe('Generation name'),
            prompt: z.string().describe('The prompt used'),
            status: z
              .number()
              .describe('Status code: 0=created, 1=pending, 2=processing, 3=done, 4=error'),
            statusLabel: z.string().describe('Human-readable status label'),
            params: z
              .array(
                z.object({
                  name: z.string().describe('Parameter name'),
                  value: z.string().describe('Parameter value')
                })
              )
              .describe('Generation parameters'),
            processMode: z.string().optional().describe('Processing mode'),
            images: z
              .array(
                z.object({
                  imageId: z.string().describe('Image ID'),
                  url: z.string().describe('Preview image URL'),
                  urlFull: z.string().describe('Full-size image URL'),
                  validated: z.boolean().optional(),
                  free: z.boolean().optional(),
                  titles: z.record(z.string(), z.string()).optional()
                })
              )
              .describe('Generated images'),
            nbImages: z.number().optional().describe('Number of images'),
            tags: z.array(z.string()).optional().describe('Tags'),
            metaData: z.record(z.string(), z.unknown()).optional().describe('Custom metadata'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .describe('Image generations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listGenerations({
      name: ctx.input.name,
      tag: ctx.input.tag,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    return {
      output: result,
      message: `Found **${result.filteredResults}** generations. Returned **${result.generations.length}** results.`
    };
  })
  .build();
