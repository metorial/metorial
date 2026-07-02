import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transformationSchema = z.object({
  transformationId: z.string().describe('Unique identifier of the transformation'),
  versionId: z.string().describe('Current version identifier'),
  name: z.string().describe('Name of the transformation'),
  description: z.string().nullable().describe('Description of the transformation'),
  language: z.string().describe('Programming language used'),
  codeVersion: z.string().nullable().describe('Code version number'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp')
});

export let listTransformations = SlateTool.create(spec, {
  name: 'List Transformations',
  key: 'list_transformations',
  description: `List all transformations in the workspace. Returns each transformation's metadata including name, language, version, and timestamps. Does not include the full code — use **Get Transformation** to retrieve the code for a specific transformation.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(z.object({}))
  .output(
    z.object({
      transformations: z
        .array(transformationSchema)
        .describe('List of transformations in the workspace')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.listTransformations();
    let transformations = result.transformations ?? result ?? [];
    let items = (Array.isArray(transformations) ? transformations : []).map((t: any) => ({
      transformationId: t.id,
      versionId: t.versionId,
      name: t.name,
      description: t.description ?? null,
      language: t.language,
      codeVersion: t.codeVersion ?? null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt
    }));

    return {
      output: { transformations: items },
      message: `Found **${items.length}** transformation(s).`
    };
  })
  .build();
