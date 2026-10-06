import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Add, remove, or replace tags on one or more Cloudinary assets. Useful for organizing and categorizing assets in bulk.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      publicIds: z.array(z.string()).describe('List of public IDs of assets to tag.'),
      tag: z.string().describe('The tag to add, remove, or use as replacement.'),
      command: z
        .enum(['add', 'remove', 'replace', 'set_exclusive', 'remove_all'])
        .describe(
          '"add" adds the tag, "remove" removes it, "replace" replaces all existing tags, "set_exclusive" sets the tag on given assets and removes it from all others, "remove_all" removes all tags from the given assets (tag value is ignored).'
        ),
      resourceType: z
        .enum(['image', 'video', 'raw'])
        .default('image')
        .describe('Resource type of the assets.')
    })
  )
  .output(z.object({ publicIds: z.array(z.string()) }))
  .handleInvocation(async ctx => {
    const result = await createClient(ctx).manageTags(ctx.input);
    return {
      output: result,
      message: `Cloudinary confirmed tag command ${ctx.input.command} for ${result.publicIds.length} asset(s).${ctx.input.command === 'set_exclusive' ? ' This command also removes these tags from other assets.' : ''}`
    };
  })
  .build();
