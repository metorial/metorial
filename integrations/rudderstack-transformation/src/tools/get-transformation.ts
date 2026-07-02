import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTransformation = SlateTool.create(spec, {
  name: 'Get Transformation',
  key: 'get_transformation',
  description: `Retrieve a specific RudderStack transformation by its ID. Returns the transformation's current code, version, language, description, and metadata.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      transformationId: z.string().describe('ID of the transformation to retrieve')
    })
  )
  .output(
    z.object({
      transformationId: z.string().describe('Unique identifier of the transformation'),
      versionId: z.string().describe('Current version identifier'),
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

    let result = await client.getTransformation(ctx.input.transformationId);

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
      message: `Retrieved transformation **${result.name}** (ID: \`${result.id}\`).`
    };
  })
  .build();
