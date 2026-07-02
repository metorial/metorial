import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { intercomServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageTags = SlateTool.create(spec, {
  name: 'Manage Tags',
  key: 'manage_tags',
  description: `Create, update, delete tags, and apply or remove tags from contacts and conversations.
Tags can be used to organize contacts, companies, and conversations for filtering and automation.`,
  instructions: [
    'Use "list" to see all available tags.',
    'Use "tag_contact" / "untag_contact" to add or remove tags from contacts.',
    'Use "tag_conversation" / "untag_conversation" to add or remove tags from conversations (requires adminId).'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'update',
          'delete',
          'list',
          'tag_contact',
          'untag_contact',
          'tag_conversation',
          'untag_conversation'
        ])
        .describe('Operation to perform'),
      tagId: z
        .string()
        .optional()
        .describe('Tag ID (required for update, delete, tagging/untagging)'),
      name: z
        .string()
        .optional()
        .describe('Tag name (required for create, optional for update)'),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID (required for tag_contact/untag_contact)'),
      conversationId: z
        .string()
        .optional()
        .describe('Conversation ID (required for tag_conversation/untag_conversation)'),
      adminId: z
        .string()
        .optional()
        .describe('Admin ID performing the action (required for conversation tagging)')
    })
  )
  .output(
    z.object({
      tagId: z.string().optional().describe('Tag ID'),
      name: z.string().optional().describe('Tag name'),
      deleted: z.boolean().optional().describe('Whether tag was deleted'),
      tags: z
        .array(
          z.object({
            tagId: z.string().describe('Tag ID'),
            name: z.string().describe('Tag name')
          })
        )
        .optional()
        .describe('List of all tags (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listTags();
      let tags = (result.data || []).map((t: any) => ({
        tagId: t.id,
        name: t.name
      }));
      return {
        output: { tags },
        message: `Found **${tags.length}** tags`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw intercomServiceError('name is required for create');
      let result = await client.createTag(ctx.input.name);
      return {
        output: { tagId: result.id, name: result.name },
        message: `Created tag **${result.name}**`
      };
    }

    if (action === 'update') {
      if (!ctx.input.tagId || !ctx.input.name)
        throw intercomServiceError('tagId and name are required for update');
      let result = await client.updateTag(ctx.input.tagId, ctx.input.name);
      return {
        output: { tagId: result.id, name: result.name },
        message: `Updated tag to **${result.name}**`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.tagId) throw intercomServiceError('tagId is required for delete');
      await client.deleteTag(ctx.input.tagId);
      return {
        output: { tagId: ctx.input.tagId, deleted: true },
        message: `Deleted tag **${ctx.input.tagId}**`
      };
    }

    if (action === 'tag_contact') {
      if (!ctx.input.contactId || !ctx.input.tagId) {
        throw intercomServiceError('contactId and tagId are required for tag_contact');
      }
      let result = await client.addTagToContact(ctx.input.contactId, ctx.input.tagId);
      return {
        output: { tagId: result.id || ctx.input.tagId, name: result.name },
        message: `Tagged contact **${ctx.input.contactId}** with tag **${ctx.input.tagId}**`
      };
    }

    if (action === 'untag_contact') {
      if (!ctx.input.contactId || !ctx.input.tagId) {
        throw intercomServiceError('contactId and tagId are required for untag_contact');
      }
      let result = await client.removeTagFromContact(ctx.input.contactId, ctx.input.tagId);
      return {
        output: { tagId: result.id || ctx.input.tagId, name: result.name },
        message: `Removed tag **${ctx.input.tagId}** from contact **${ctx.input.contactId}**`
      };
    }

    if (action === 'tag_conversation') {
      if (!ctx.input.conversationId || !ctx.input.tagId || !ctx.input.adminId) {
        throw intercomServiceError(
          'conversationId, tagId, and adminId are required for tag_conversation'
        );
      }
      let result = await client.addTagToConversation(
        ctx.input.conversationId,
        ctx.input.tagId,
        ctx.input.adminId
      );
      return {
        output: { tagId: result.id || ctx.input.tagId, name: result.name },
        message: `Tagged conversation **${ctx.input.conversationId}** with tag **${ctx.input.tagId}**`
      };
    }

    if (action === 'untag_conversation') {
      if (!ctx.input.conversationId || !ctx.input.tagId || !ctx.input.adminId) {
        throw intercomServiceError(
          'conversationId, tagId, and adminId are required for untag_conversation'
        );
      }
      let result = await client.removeTagFromConversation(
        ctx.input.conversationId,
        ctx.input.tagId,
        ctx.input.adminId
      );
      return {
        output: { tagId: result.id || ctx.input.tagId, name: result.name },
        message: `Removed tag **${ctx.input.tagId}** from conversation **${ctx.input.conversationId}**`
      };
    }

    throw intercomServiceError(`Unknown action: ${action}`);
  })
  .build();
