import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getGeneration = SlateTool.create(spec, {
  name: 'Get Generation',
  key: 'get_generation',
  description: `Retrieve the details and current status of an image generation by its ID. Use this to check if a generation is complete and to access the resulting images. Status progresses: created → pending → processing → done (or error).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      generationId: z.string().describe('ID of the image generation to retrieve')
    })
  )
  .output(
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
      processMode: z.string().optional().describe('Processing mode (fast or relax)'),
      images: z
        .array(
          z.object({
            imageId: z.string().describe('Image ID'),
            url: z.string().describe('Preview image URL'),
            urlFull: z.string().describe('Full-size image URL'),
            validated: z.boolean().optional().describe('Whether the image was validated'),
            free: z.boolean().optional().describe('Whether the image is free'),
            titles: z
              .record(z.string(), z.string())
              .optional()
              .describe('Image titles by language')
          })
        )
        .describe('Generated images (available when status is done)'),
      nbImages: z.number().optional().describe('Number of images'),
      tags: z.array(z.string()).optional().describe('Tags'),
      metaData: z.record(z.string(), z.unknown()).optional().describe('Custom metadata'),
      createdAt: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let generation = await client.getGeneration(ctx.input.generationId);

    let statusInfo =
      generation.status === 3
        ? `**Done** with ${generation.images.length} images`
        : generation.status === 4
          ? '**Error** — can be retried after modifying the prompt'
          : `**${generation.statusLabel}**`;

    return {
      output: generation,
      message: `Generation **"${generation.name}"** (ID: \`${generation.generationId}\`) — status: ${statusInfo}.`
    };
  })
  .build();
