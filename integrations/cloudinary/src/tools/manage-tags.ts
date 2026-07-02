import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/create-client';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Add, remove, or replace tags on one or more Cloudinary assets. Useful for organizing and categorizing assets in bulk.`,
  tags: {
    destructive: false,
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
  .output(
    z.object({
      publicIds: z.array(z.string()).describe('Public IDs of the affected assets.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.manageTags({
      publicIds: ctx.input.publicIds,
      tag: ctx.input.tag,
      command: ctx.input.command,
      resourceType: ctx.input.resourceType
    });

    let commandLabel =
      ctx.input.command === 'add'
        ? 'Added'
        : ctx.input.command === 'remove'
          ? 'Removed'
          : ctx.input.command === 'replace'
            ? 'Replaced with'
            : ctx.input.command === 'set_exclusive'
              ? 'Set exclusive'
              : 'Removed all';

    return {
      output: result,
      message: `${commandLabel} tag **${ctx.input.tag}** on ${ctx.input.publicIds.length} asset(s).`
    };
  })
  .build();
