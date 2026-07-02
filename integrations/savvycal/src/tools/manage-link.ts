import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLinkTool = SlateTool.create(spec, {
  name: 'Manage Scheduling Link',
  key: 'manage_link',
  description: `Create, update, or delete a SavvyCal scheduling link. Use the **action** field to specify the operation:
- **create**: Create a new personal scheduling link
- **update**: Update an existing link's properties
- **delete**: Delete a scheduling link
- **duplicate**: Duplicate an existing link`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'duplicate'])
        .describe('The action to perform'),
      linkId: z
        .string()
        .optional()
        .describe('Link ID (required for update, delete, and duplicate)'),
      name: z.string().optional().describe('Public link name (required for create)'),
      slug: z.string().optional().describe('URL slug for the link'),
      privateName: z.string().optional().describe('Private name visible only to the owner'),
      description: z.string().optional().describe('Link description'),
      defaultDuration: z.number().optional().describe('Default meeting duration in minutes'),
      durations: z
        .array(z.number())
        .optional()
        .describe('Available duration options in minutes'),
      increment: z.number().optional().describe('Time slot increment in minutes'),
      state: z.enum(['active', 'pending', 'disabled']).optional().describe('Link state')
    })
  )
  .output(
    z.object({
      linkId: z.string().describe('Link identifier'),
      name: z.string().optional().describe('Public link name'),
      slug: z.string().optional().describe('URL slug'),
      state: z.string().optional().describe('Link state'),
      defaultDuration: z.number().optional().describe('Default duration in minutes'),
      deleted: z.boolean().optional().describe('True if the link was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, linkId } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required for creating a link');

      let l = await client.createLink({
        name: ctx.input.name,
        slug: ctx.input.slug,
        privateName: ctx.input.privateName,
        description: ctx.input.description,
        defaultDuration: ctx.input.defaultDuration,
        durations: ctx.input.durations,
        increment: ctx.input.increment,
        state: ctx.input.state
      });

      return {
        output: {
          linkId: l.id,
          name: l.name,
          slug: l.slug,
          state: l.state,
          defaultDuration: l.default_duration
        },
        message: `Created scheduling link **"${l.name}"** (/${l.slug}).`
      };
    }

    if (!linkId)
      throw new Error('Link ID is required for update, delete, and duplicate actions');

    if (action === 'update') {
      let l = await client.updateLink(linkId, {
        name: ctx.input.name,
        slug: ctx.input.slug,
        privateName: ctx.input.privateName,
        description: ctx.input.description,
        defaultDuration: ctx.input.defaultDuration,
        durations: ctx.input.durations,
        increment: ctx.input.increment,
        state: ctx.input.state
      });

      return {
        output: {
          linkId: l.id,
          name: l.name,
          slug: l.slug,
          state: l.state,
          defaultDuration: l.default_duration
        },
        message: `Updated scheduling link **"${l.name}"**.`
      };
    }

    if (action === 'duplicate') {
      let l = await client.duplicateLink(linkId);

      return {
        output: {
          linkId: l.id,
          name: l.name,
          slug: l.slug,
          state: l.state,
          defaultDuration: l.default_duration
        },
        message: `Duplicated scheduling link as **"${l.name}"**.`
      };
    }

    // delete
    await client.deleteLink(linkId);

    return {
      output: {
        linkId,
        deleted: true
      },
      message: `Deleted scheduling link **${linkId}**.`
    };
  })
  .build();
