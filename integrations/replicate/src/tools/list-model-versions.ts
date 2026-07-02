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
