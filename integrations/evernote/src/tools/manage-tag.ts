import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { evernoteServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageTagTool = SlateTool.create(spec, {
  name: 'Manage Tag',
  key: 'manage_tag',
  description: `Create a new tag or update an existing tag's name or parent. Tags organize notes and can form hierarchies via parent-child relationships. To remove a tag from all notes, use the **untagAll** action.`,
  instructions: [
    'To create a tag, provide just the name (and optional parentGuid).',
    'To update a tag, provide the tagGuid along with the fields to change.',
    'To remove a tag from all notes, set action to "untag_all" with the tagGuid.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'untag_all']).describe('Action to perform'),
      tagGuid: z
        .string()
        .optional()
        .describe('GUID of the existing tag (required for update and untag_all)'),
      name: z
        .string()
        .optional()
        .describe('Tag name (required for create, optional for update)'),
      parentGuid: z.string().optional().describe('GUID of the parent tag for hierarchy')
    })
  )
  .output(
    z.object({
      tagGuid: z.string().optional().describe('GUID of the created or updated tag'),
      name: z.string().optional().describe('Name of the tag'),
      parentGuid: z.string().optional().describe('GUID of the parent tag'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      noteStoreUrl: ctx.auth.noteStoreUrl
    });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) {
        throw evernoteServiceError('Tag name is required for create action.');
      }
      let tag = await client.createTag({
        name: ctx.input.name,
        parentGuid: ctx.input.parentGuid
      });
      return {
        output: {
          tagGuid: tag.tagGuid,
          name: tag.name,
          parentGuid: tag.parentGuid,
          success: true
        },
        message: `Created tag **${tag.name}**.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.tagGuid) {
        throw evernoteServiceError('tagGuid is required for update action.');
      }
      await client.updateTag({
        tagGuid: ctx.input.tagGuid,
        name: ctx.input.name,
        parentGuid: ctx.input.parentGuid
      });
      return {
        output: {
          tagGuid: ctx.input.tagGuid,
          name: ctx.input.name,
          parentGuid: ctx.input.parentGuid,
          success: true
        },
        message: `Updated tag \`${ctx.input.tagGuid}\`.`
      };
    }

    if (ctx.input.action === 'untag_all') {
      if (!ctx.input.tagGuid) {
        throw evernoteServiceError('tagGuid is required for untag_all action.');
      }
      await client.untagAll(ctx.input.tagGuid);
      return {
        output: {
          tagGuid: ctx.input.tagGuid,
          success: true
        },
        message: `Removed tag \`${ctx.input.tagGuid}\` from all notes.`
      };
    }

    throw evernoteServiceError(`Unknown tag action: ${ctx.input.action}.`);
  })
  .build();
