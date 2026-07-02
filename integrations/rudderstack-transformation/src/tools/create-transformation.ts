import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createTransformation = SlateTool.create(spec, {
  name: 'Create Transformation',
  key: 'create_transformation',
  description: `Create a new RudderStack transformation function. Transformations are custom JavaScript or Python functions that convert event data into destination-specific formats in real-time.
When **publish** is false (default), the transformation is created as a draft and cannot be connected to destinations. Set **publish** to true to make it live for incoming event traffic and optionally connect destinations.`,
  instructions: [
    'The code must export a transformEvent function, e.g.: export function transformEvent(event) { return event; }',
    'Use "javascript" or "pythonfaas" as the language value.',
    'Destination IDs can only be connected when publish is set to true.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the transformation'),
      code: z.string().describe('Transformation function code'),
      language: z
        .enum(['javascript', 'pythonfaas'])
        .describe('Programming language: "javascript" or "pythonfaas" (Python 3.11)'),
      description: z.string().optional().describe('Description of the transformation'),
      publish: z
        .boolean()
        .optional()
        .describe(
          'If true, publishes the transformation and makes it live for incoming traffic. Defaults to false.'
        ),
      destinationIds: z
        .array(z.string())
        .optional()
        .describe('Array of destination IDs to connect (only applied when publish is true)')
    })
  )
  .output(
    z.object({
      transformationId: z.string().describe('Unique identifier of the created transformation'),
      versionId: z.string().describe('Version identifier of the created transformation'),
      name: z.string().describe('Name of the transformation'),
      description: z.string().nullable().describe('Description of the transformation'),
      code: z.string().describe('Transformation function code'),
      codeVersion: z.string().nullable().describe('Code version number'),
      language: z.string().describe('Programming language used'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.createTransformation({
      name: ctx.input.name,
      code: ctx.input.code,
      language: ctx.input.language,
      description: ctx.input.description,
      publish: ctx.input.publish,
      destinationIds: ctx.input.destinationIds
    });

    let published = ctx.input.publish ? 'published' : 'draft';

    return {
      output: {
        transformationId: result.id,
        versionId: result.versionId,
        name: result.name,
        description: result.description ?? null,
        code: result.code,
        codeVersion: result.codeVersion ?? null,
        language: result.language,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt
      },
      message: `Created ${published} transformation **${result.name}** (ID: \`${result.id}\`).`
    };
  })
  .build();
