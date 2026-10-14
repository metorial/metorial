import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export const listTagLists = SlateTool.create(spec, {
  key: 'list_tag_lists',
  name: 'List Tag Lists',
  description:
    'List TimeCamp tag lists. Use a returned tagListId with manage_tag to create a tag or list_tags to view its tags.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      tagLists: z.array(
        z.object({ tagListId: z.string(), name: z.string(), archived: z.string() })
      )
    })
  )
  .handleInvocation(async ctx => {
    const records = await new Client({ token: ctx.auth.token }).getTagLists();
    const tagLists = records.map(list => ({
      tagListId: String(list.id ?? ''),
      name: String(list.name ?? ''),
      archived: String(list.archived ?? 0)
    }));
    return { output: { tagLists }, message: `Retrieved **${tagLists.length}** tag lists.` };
  })
  .build();
