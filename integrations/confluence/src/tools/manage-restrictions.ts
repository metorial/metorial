import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getContentRestrictions = SlateTool.create(spec, {
  name: 'Get Content Restrictions',
  key: 'get_content_restrictions',
  description: `Get read and update restrictions on a Confluence content item. Shows which users and groups have restricted access.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      contentId: z.string().describe('The content ID (page or blog post)')
    })
  )
  .output(
    z.object({
      restrictions: z
        .any()
        .describe('Content restriction details including read and update permissions')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let restrictions = await client.getContentRestrictions(ctx.input.contentId);

    return {
      output: { restrictions },
      message: `Retrieved restrictions for content ${ctx.input.contentId}`
    };
  })
  .build();

export let updateContentRestrictions = SlateTool.create(spec, {
  name: 'Update Content Restrictions',
  key: 'update_content_restrictions',
  description: `Set read or update restrictions on a Confluence content item. Controls which users and groups can view or edit the content.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      contentId: z.string().describe('The content ID (page or blog post)'),
      restrictions: z
        .array(
          z.object({
            operation: z.enum(['read', 'update']).describe('The operation to restrict'),
            userAccountIds: z
              .array(z.string())
              .optional()
              .describe('Account IDs of users to grant access'),
            groupNames: z.array(z.string()).optional().describe('Group names to grant access')
          })
        )
        .describe('Restriction rules to apply')
    })
  )
  .output(
    z.object({
      updated: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    await client.updateContentRestrictions(
      ctx.input.contentId,
      ctx.input.restrictions.map(r => ({
        operation: r.operation,
        users: r.userAccountIds,
        groups: r.groupNames
      }))
    );

    return {
      output: { updated: true },
      message: `Updated restrictions on content ${ctx.input.contentId}`
    };
  })
  .build();

export let removeContentRestrictions = SlateTool.create(spec, {
  name: 'Remove Content Restrictions',
  key: 'remove_content_restrictions',
  description: `Remove all restrictions from a Confluence content item, making it accessible according to space-level permissions.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      contentId: z.string().describe('The content ID (page or blog post)')
    })
  )
  .output(
    z.object({
      removed: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    await client.deleteContentRestrictions(ctx.input.contentId);

    return {
      output: { removed: true },
      message: `Removed all restrictions from content ${ctx.input.contentId}`
    };
  })
  .build();
