import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listModelVersions = SlateTool.create(spec, {
  name: 'List Model Versions',
  key: 'list_model_versions',
  description: `List all versions of a specific model. Each version represents a different iteration of the model with its own input/output schema.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Model owner username'),
      modelName: z.string().describe('Model name'),
      cursor: z.string().optional().describe('Pagination cursor')
    })
  )
  .output(
    z.object({
      versions: z.array(
        z.object({
          versionId: z.string().describe('Version ID'),
          createdAt: z.string().describe('When the version was created'),
          cogVersion: z.string().optional().describe('Cog version used to build this version')
        })
      ),
      nextCursor: z.string().optional().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listModelVersions(ctx.input.owner, ctx.input.modelName, {
      cursor: ctx.input.cursor
    });

    let versions = (result.results || []).map((v: any) => ({
      versionId: v.id,
      createdAt: v.created_at,
      cogVersion: v.cog_version
    }));

    let nextCursor = result.next ? new URL(result.next).searchParams.get('cursor') : null;

    return {
      output: { versions, nextCursor },
      message: `Found **${versions.length}** versions of **${ctx.input.owner}/${ctx.input.modelName}**.`
    };
  })
  .build();

export let getModelVersion = SlateTool.create(spec, {
  name: 'Get Model Version',
  key: 'get_model_version',
  description: `Get a specific model version, including the OpenAPI schema that describes its inputs and outputs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Model owner username'),
      modelName: z.string().describe('Model name'),
      versionId: z.string().describe('Model version ID')
    })
  )
  .output(
    z.object({
      versionId: z.string().describe('Version ID'),
      createdAt: z.string().describe('When the version was created'),
      cogVersion: z
        .string()
        .optional()
        .nullable()
        .describe('Cog version used to build this version'),
      openapiSchema: z
        .record(z.string(), z.any())
        .optional()
        .nullable()
        .describe('OpenAPI schema for this model version inputs and outputs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getModelVersion(
      ctx.input.owner,
      ctx.input.modelName,
      ctx.input.versionId
    );

    return {
      output: {
        versionId: result.id,
        createdAt: result.created_at,
        cogVersion: result.cog_version,
        openapiSchema: result.openapi_schema
      },
      message: `Retrieved version **${result.id}** for **${ctx.input.owner}/${ctx.input.modelName}**.`
    };
  })
  .build();

export let deleteModelVersion = SlateTool.create(spec, {
  name: 'Delete Model Version',
  key: 'delete_model_version',
  description: `Delete a private model version and its associated predictions and output files.`,
  constraints: [
    'Version must belong to a private model owned by the authenticated user.',
    'Version cannot have been run by another user.',
    'Version cannot be used as a training base, deployment, or override target.',
    'Deletion is accepted asynchronously by Replicate and may take a few minutes.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Model owner username'),
      modelName: z.string().describe('Model name'),
      versionId: z.string().describe('Model version ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether deletion was accepted'),
      owner: z.string().describe('Model owner'),
      modelName: z.string().describe('Model name'),
      versionId: z.string().describe('Deleted version ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteModelVersion(ctx.input.owner, ctx.input.modelName, ctx.input.versionId);

    return {
      output: {
        deleted: true,
        owner: ctx.input.owner,
        modelName: ctx.input.modelName,
        versionId: ctx.input.versionId
      },
      message: `Model version **${ctx.input.owner}/${ctx.input.modelName}:${ctx.input.versionId}** deletion accepted.`
    };
  })
  .build();
