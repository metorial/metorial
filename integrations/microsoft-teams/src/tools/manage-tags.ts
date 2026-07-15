import { SlateTool } from 'slates';
import { z } from 'zod';
import { GraphClient } from '../lib/client';
import { microsoftTeamsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Create, list, update, or delete tags for a Microsoft Team. Tags group users and enable @mentions for subsets of a team. Can also manage tag members.`,
  instructions: [
    'To list all tags, set action to "list".',
    'To create a tag, provide displayName and optionally memberUserIds to add initial members.',
    'To add/remove tag members, use action "add_member" or "remove_member".'
  ]
})
  .scopes(microsoftTeamsActionScopes.manageTags)
  .input(
    z.object({
      teamId: z.string().describe('ID of the team'),
      action: z
        .enum([
          'list',
          'create',
          'update',
          'delete',
          'list_members',
          'add_member',
          'remove_member'
        ])
        .describe('Action to perform'),
      tagId: z
        .string()
        .optional()
        .describe('Tag ID (required for update/delete/member operations)'),
      displayName: z.string().optional().describe('Tag display name (for create/update)'),
      memberUserIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to add as initial tag members (for create)'),
      userId: z.string().optional().describe('User ID to add to tag (for add_member)'),
      tagMemberId: z
        .string()
        .optional()
        .describe('Tag member ID to remove (for remove_member)')
    })
  )
  .output(
    z.object({
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Tag ID'),
            displayName: z.string().describe('Tag display name'),
            memberCount: z.number().optional().describe('Number of members')
          })
        )
        .optional()
        .describe('List of tags'),
      tagMembers: z
        .array(
          z.object({
            tagMemberId: z.string().describe('Tag member entry ID'),
            displayName: z.string().nullable().describe('Member display name'),
            userId: z.string().describe('Member user ID')
          })
        )
        .optional()
        .describe('List of tag members'),
      tagId: z.string().optional().describe('Tag ID of created/updated tag'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GraphClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let tags = await client.listTags(ctx.input.teamId);
      let mapped = tags.map((t: any) => ({
        tagId: t.id,
        displayName: t.displayName,
        memberCount: t.memberCount
      }));
      return {
        output: { tags: mapped, success: true },
        message: `Found **${mapped.length}** tags.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.displayName) throw new Error('displayName is required for create');
      let initialMemberIds =
        ctx.input.memberUserIds && ctx.input.memberUserIds.length > 0
          ? ctx.input.memberUserIds
          : [String((await client.getMe()).id)];
      let body: any = {
        displayName: ctx.input.displayName,
        members: initialMemberIds.map((uid: string) => ({ userId: uid }))
      };
      let tag = await client.createTag(ctx.input.teamId, body);
      return {
        output: { tagId: tag.id, success: true },
        message: `Tag **${ctx.input.displayName}** created.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.tagId) throw new Error('tagId is required for update');
      let body: any = {};
      if (ctx.input.displayName) body.displayName = ctx.input.displayName;
      await client.updateTag(ctx.input.teamId, ctx.input.tagId, body);
      return {
        output: { tagId: ctx.input.tagId, success: true },
        message: `Tag updated successfully.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.tagId) throw new Error('tagId is required for delete');
      await client.deleteTag(ctx.input.teamId, ctx.input.tagId);
      return {
        output: { success: true },
        message: `Tag deleted successfully.`
      };
    }

    if (ctx.input.action === 'list_members') {
      if (!ctx.input.tagId) throw new Error('tagId is required for list_members');
      let members = await client.listTagMembers(ctx.input.teamId, ctx.input.tagId);
      let mapped = members.map((m: any) => ({
        tagMemberId: m.id,
        displayName: m.displayName || null,
        userId: m.userId
      }));
      return {
        output: { tagMembers: mapped, success: true },
        message: `Found **${mapped.length}** tag members.`
      };
    }

    if (ctx.input.action === 'add_member') {
      if (!ctx.input.tagId) throw new Error('tagId is required');
      if (!ctx.input.userId) throw new Error('userId is required');
      await client.addTagMember(ctx.input.teamId, ctx.input.tagId, ctx.input.userId);
      return {
        output: { success: true },
        message: `Member added to tag.`
      };
    }

    if (ctx.input.action === 'remove_member') {
      if (!ctx.input.tagId) throw new Error('tagId is required');
      if (!ctx.input.tagMemberId) throw new Error('tagMemberId is required');
      await client.removeTagMember(ctx.input.teamId, ctx.input.tagId, ctx.input.tagMemberId);
      return {
        output: { success: true },
        message: `Member removed from tag.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
