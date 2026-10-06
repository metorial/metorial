import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, pageInfo } from '../lib/helpers';
import { malformed, pageInput, pageOutput } from '../lib/schemas';
import { spec } from '../spec';
export let listSpaces = SlateTool.create(spec, {
  name: 'List Spaces',
  key: 'list_spaces',
  description:
    'List a page of spaces accessible to the Content Management API user. Use returned space IDs on subsequent tools.',
  tags: { readOnly: true }
})
  .input(z.object({ ...pageInput }))
  .output(
    z.object({
      ...pageOutput,
      spaces: z.array(z.object({ spaceId: z.string(), name: z.string() }))
    })
  )
  .handleInvocation(async ctx => {
    let page = await createClient(ctx.config, ctx.auth, {}, true).getSpaces(ctx.input);
    return {
      output: {
        ...pageInfo(page),
        spaces: page.items.map(space => {
          if (!space.name) throw malformed();
          return { spaceId: space.sys.id, name: space.name };
        })
      },
      message: `Retrieved ${page.items.length} accessible spaces.`
    };
  })
  .build();
