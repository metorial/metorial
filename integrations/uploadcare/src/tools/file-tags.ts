import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let fileId = z.string().describe('File UUID; discover files with list_files or search_files');
let tags = z
  .array(z.string())
  .describe('Tags normalized by Uploadcare to lowercase with whitespace removed');
let changedTags = z.object({
  tags: tags.describe('Resulting tags in provider storage order'),
  added: z.array(z.string()).describe('Tags actually added'),
  deleted: z.array(z.string()).describe('Tags actually removed')
});

export let getFileTags = SlateTool.create(spec, {
  name: 'Get File Tags',
  key: 'get_file_tags',
  description: 'Read the ordered tag list for a file.',
  tags: { readOnly: true }
})
  .input(z.object({ fileId }))
  .output(z.object({ tags }))
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).getFileTags(ctx.input.fileId);
    return { output: result, message: `Retrieved **${result.tags.length}** file tag(s).` };
  })
  .build();

export let replaceFileTags = SlateTool.create(spec, {
  name: 'Replace File Tags',
  key: 'replace_file_tags',
  description:
    'Replace the complete tag set on a file. An empty list clears all tags. Uploadcare normalizes and deduplicates tags, with at most 50 tags per file.'
})
  .input(z.object({ fileId, tags }))
  .output(changedTags)
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).replaceFileTags(ctx.input.fileId, ctx.input.tags);
    return {
      output: result,
      message: `Replaced file tags; **${result.tags.length}** tag(s) remain.`
    };
  })
  .build();

export let updateFileTags = SlateTool.create(spec, {
  name: 'Update File Tags',
  key: 'update_file_tags',
  description:
    'Atomically add and remove file tags. Deletions run before additions. Existing additions and absent deletions are ignored; an empty update returns the current tags.'
})
  .input(
    z.object({
      fileId,
      add: tags.optional().describe('Tags to add'),
      delete: tags.optional().describe('Tags to remove')
    })
  )
  .output(changedTags)
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth).updateFileTags(ctx.input.fileId, {
      add: ctx.input.add,
      delete: ctx.input.delete
    });
    return {
      output: result,
      message: `Updated file tags: **${result.added.length}** added, **${result.deleted.length}** removed.`
    };
  })
  .build();
