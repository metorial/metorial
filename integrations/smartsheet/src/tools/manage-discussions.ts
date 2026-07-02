import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

let commentSchema = z.object({
  commentId: z.number().optional().describe('Comment ID'),
  text: z.string().optional().describe('Comment text'),
  createdBy: z
    .object({
      email: z.string().optional().describe('Author email'),
      name: z.string().optional().describe('Author name')
    })
    .optional()
    .describe('Comment author'),
  createdAt: z.string().optional().describe('When the comment was created')
});

let discussionSchema = z.object({
  discussionId: z.number().describe('Discussion ID'),
  title: z.string().optional().describe('Discussion title'),
  comments: z.array(commentSchema).optional().describe('Comments in this discussion'),
  lastCommentedAt: z.string().optional().describe('When the last comment was added'),
  parentType: z.string().optional().describe('Parent type (SHEET or ROW)'),
  parentId: z.number().optional().describe('Parent object ID')
});

export let manageDiscussions = SlateTool.create(spec, {
  name: 'Manage Discussions',
  key: 'manage_discussions',
  description: `List, create, or reply to discussions on sheets and rows. Discussions are threaded comment collections attached to a sheet or a specific row. Use **action** to specify the operation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'reply', 'delete']).describe('Action to perform'),
      sheetId: z.string().describe('ID of the sheet'),
      rowId: z.string().optional().describe('Row ID (for row-level discussions)'),
      discussionId: z.string().optional().describe('Discussion ID (for reply and delete)'),
      commentText: z.string().optional().describe('Comment text (for create and reply)')
    })
  )
  .output(
    z.object({
      discussions: z.array(discussionSchema).optional().describe('Listed discussions'),
      discussion: discussionSchema.optional().describe('Created or updated discussion'),
      success: z.boolean().optional().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result: any;
      if (ctx.input.rowId) {
        result = await client.listRowDiscussions(ctx.input.sheetId, ctx.input.rowId, {
          include: 'comments',
          includeAll: true
        });
      } else {
        result = await client.listSheetDiscussions(ctx.input.sheetId, {
          include: 'comments',
          includeAll: true
        });
      }

      let discussions = (result.data || []).map((d: any) => ({
        discussionId: d.id,
        title: d.title,
        comments: (d.comments || []).map((c: any) => ({
          commentId: c.id,
          text: c.text,
          createdBy: c.createdBy
            ? { email: c.createdBy.email, name: c.createdBy.name }
            : undefined,
          createdAt: c.createdAt
        })),
        lastCommentedAt: d.lastCommentedAt,
        parentType: d.parentType,
        parentId: d.parentId
      }));

      return {
        output: { discussions },
        message: `Found **${discussions.length}** discussion(s).`
      };
    }

    if (ctx.input.action === 'create') {
      let result: any;
      if (ctx.input.rowId) {
        result = await client.createDiscussionOnRow(ctx.input.sheetId, ctx.input.rowId, {
          comment: { text: ctx.input.commentText! }
        });
      } else {
        result = await client.createDiscussionOnSheet(ctx.input.sheetId, {
          comment: { text: ctx.input.commentText! }
        });
      }

      let d = result.result || result;
      return {
        output: {
          discussion: {
            discussionId: d.id,
            title: d.title
          }
        },
        message: `Created discussion (ID: ${d.id}).`
      };
    }

    if (ctx.input.action === 'reply') {
      let result = await client.addComment(ctx.input.sheetId, ctx.input.discussionId!, {
        text: ctx.input.commentText!
      });

      let _c = result.result || result;
      return {
        output: {
          success: true
        },
        message: `Added reply to discussion **${ctx.input.discussionId}**.`
      };
    }

    // delete
    await client.deleteDiscussion(ctx.input.sheetId, ctx.input.discussionId!);
    return {
      output: { success: true },
      message: `Deleted discussion **${ctx.input.discussionId}**.`
    };
  })
  .build();
