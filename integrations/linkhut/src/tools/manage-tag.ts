import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTag = SlateTool.create(spec, {
  name: 'Manage Tag',
  key: 'manage_tag',
  description: `Delete or rename a tag across all bookmarks. When deleting, the tag is removed from all bookmarks but the bookmarks themselves are preserved. When renaming, all bookmarks with the old tag will be updated to use the new tag name.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['delete', 'rename']).describe('Action to perform on the tag'),
      tag: z.string().describe('The tag to delete or rename'),
      newTag: z
        .string()
        .optional()
        .describe('New name for the tag (required when action is "rename")')
    })
  )
  .output(
    z.object({
      resultCode: z.string().describe('Result code from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'rename') {
      if (!ctx.input.newTag) {
        throw new Error('newTag is required when action is "rename"');
      }
      let result = await client.renameTag(ctx.input.tag, ctx.input.newTag);
      return {
        output: result,
        message: `Tag "${ctx.input.tag}" renamed to "${ctx.input.newTag}". Result: ${result.resultCode}`
      };
    }

    let result = await client.deleteTag(ctx.input.tag);
    return {
      output: result,
      message: `Tag "${ctx.input.tag}" deleted from all bookmarks. Result: ${result.resultCode}`
    };
  })
  .build();
