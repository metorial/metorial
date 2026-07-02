import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

export let listScreenVersions = SlateTool.create(spec, {
  name: 'List Screen Versions',
  key: 'list_screen_versions',
  description: `List all versions of a specific screen in a Zeplin project. Screen versions represent the history of published design updates. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      screenId: z.string().describe('ID of the screen'),
      limit: z.number().min(1).max(100).optional().describe('Number of results per page'),
      offset: z.number().min(0).optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      versions: z.array(z.any()).describe('List of screen versions with metadata')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let versions = (await client.listScreenVersions(ctx.input.projectId, ctx.input.screenId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    })) as any[];

    return {
      output: { versions },
      message: `Found **${versions.length}** version(s) for the screen.`
    };
  })
  .build();
