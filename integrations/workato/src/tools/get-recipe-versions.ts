import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let getRecipeVersionsTool = SlateTool.create(spec, {
  name: 'Get Recipe Versions',
  key: 'get_recipe_versions',
  description: `List all versions of a specific recipe. Each version includes the author, comment, version number, and timestamps. Useful for auditing recipe changes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recipeId: z.string().describe('ID of the recipe'),
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page (max: 100)')
    })
  )
  .output(
    z.object({
      versions: z.array(
        z.object({
          versionId: z.number().describe('Version ID'),
          versionNo: z.number().describe('Version number'),
          comment: z.string().nullable().describe('Version comment'),
          authorName: z.string().nullable().describe('Author name'),
          authorEmail: z.string().nullable().describe('Author email'),
          createdAt: z.string().describe('Version creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listRecipeVersions(ctx.input.recipeId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let items = result.data ?? (Array.isArray(result) ? result : []);
    let versions = items.map((v: any) => ({
      versionId: v.id,
      versionNo: v.version_no,
      comment: v.comment ?? null,
      authorName: v.author_name ?? null,
      authorEmail: v.author_email ?? null,
      createdAt: v.created_at
    }));

    return {
      output: { versions },
      message: `Found **${versions.length}** versions for recipe ${ctx.input.recipeId}.`
    };
  });
