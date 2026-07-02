import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateTransformation = SlateTool.create(spec, {
  name: 'Update Transformation',
  key: 'update_transformation',
  description: `Update an existing RudderStack transformation. You can modify the name, code, description, and optionally publish the updated version. Each update creates a new revision, preserving the full version history.
Set **publish** to true to make the updated code live for incoming event traffic.`,
  instructions: [
    'Only provide the fields you want to update.',
    'Destination IDs can only be connected when publish is set to true.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      transformationId: z.string().describe('ID of the transformation to update'),
      name: z.string().optional().describe('New name for the transformation'),
      code: z.string().optional().describe('Updated transformation function code'),
      description: z.string().optional().describe('Updated description'),
      publish: z
        .boolean()
        .optional()
        .describe('If true, publishes the updated version and makes it live'),
      destinationIds: z
        .array(z.string())
        .optional()
        .describe('Array of destination IDs to connect (only applied when publish is true)')
    })
  )
  .output(
    z.object({
      transformationId: z.string().describe('Unique identifier of the transformation'),
      versionId: z.string().describe('New version identifier after update'),
      name: z.string().describe('Name of the transformation'),
      description: z.string().nullable().describe('Description of the transformation'),
      code: z.string().describe('Updated transformation function code'),
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

    let result = await client.updateTransformation(ctx.input.transformationId, {
      name: ctx.input.name,
      code: ctx.input.code,
      description: ctx.input.description,
      publish: ctx.input.publish,
      destinationIds: ctx.input.destinationIds
    });

    let published = ctx.input.publish ? ' and published' : '';

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
      message: `Updated${published} transformation **${result.name}** (ID: \`${result.id}\`, version: \`${result.versionId}\`).`
    };
  })
  .build();
