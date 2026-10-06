import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import * as map from '../lib/mappers';
import { records } from '../lib/validation';
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
          versionId: z.number().optional().describe('Version ID'),
          versionNo: z.number().optional().describe('Version number'),
          comment: z.string().nullable().optional().describe('Version comment'),
          authorName: z.string().nullable().optional().describe('Author name'),
          authorEmail: z.string().nullable().optional().describe('Author email'),
          createdAt: z.string().optional().describe('Version creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    const client = createClient(ctx);
    const result = await client.listRecipeVersions(ctx.input.recipeId, ctx.input);
    const versions = records(result.items).map(map.version);
    return {
      output: { versions },
      message: `Returned ${versions.length} versions from this page.`
    };
  });
