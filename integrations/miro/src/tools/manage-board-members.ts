import { SlateTool } from 'slates';
import { z } from 'zod';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let shareBoard = SlateTool.create(spec, {
  name: 'Share Board',
  key: 'share_board',
  description: `Shares a Miro board by inviting users via email. You can specify a role for the invited members and include an optional message.`,
  instructions: [
    'Role options: viewer, commenter, editor.',
    'You can invite multiple users at once by passing an array of emails.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board to share'),
      emails: z
        .array(z.string().email())
        .min(1)
        .max(20)
        .describe('Email addresses of 1 to 20 users to invite'),
      role: z
        .enum(['viewer', 'commenter', 'editor'])
        .optional()
        .describe('Role to assign to invited users'),
      message: z.string().optional().describe('Optional message included in the invitation')
    })
  )
  .output(
    z.object({
      invited: z.boolean().describe('Whether the invitations were sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    await client.shareBoard(ctx.input.boardId, {
      emails: ctx.input.emails,
      role: ctx.input.role,
      message: ctx.input.message
    });

    return {
      output: { invited: true },
      message: `Invited **${ctx.input.emails.length}** user(s) to board ${ctx.input.boardId}${ctx.input.role ? ` as ${ctx.input.role}` : ''}.`
    };
  })
  .build();

export let getBoardMembers = SlateTool.create(spec, {
  name: 'Get Board Members',
  key: 'get_board_members',
  description: `Retrieves members of a Miro board, including their roles and user information. Supports pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board'),
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe('Maximum number of members to return, from 1 to 50'),
      offset: z.string().regex(/^\d+$/).optional().describe('Zero-based pagination offset')
    })
  )
  .output(
    z.object({
      members: z
        .array(
          z.object({
            memberId: z.string().describe('Member ID'),
            name: z.string().optional().describe('Member name'),
            role: z.string().optional().describe('Member role on the board')
          })
        )
        .describe('List of board members'),
      total: z.number().optional().describe('Total number of members'),
      offset: z.string().optional().describe('Offset for the next page, if available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    let result = await client.getBoardMembers(ctx.input.boardId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let members = (result.data || []).map((member: any) => ({
      memberId: member.id?.toString(),
      name: member.name ?? undefined,
      role: member.role ?? undefined
    }));

    let nextOffset = Number(result.offset ?? ctx.input.offset ?? 0) + members.length;

    return {
      output: {
        members,
        total: result.total ?? undefined,
        offset:
          members.length > 0 && nextOffset < result.total ? String(nextOffset) : undefined
      },
      message: `Found **${members.length}** member(s) on board ${ctx.input.boardId}.`
    };
  })
  .build();

export let updateBoardMember = SlateTool.create(spec, {
  name: 'Update Board Member',
  key: 'update_board_member',
  description: `Updates a board member's role on a Miro board.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board'),
      memberId: z.string().describe('ID of the member to update'),
      role: z.enum(['viewer', 'commenter', 'editor']).describe('New role for the member')
    })
  )
  .output(
    z.object({
      memberId: z.string().describe('Updated member ID'),
      role: z.string().describe('Updated role')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    let member = await client.updateBoardMember(ctx.input.boardId, ctx.input.memberId, {
      role: ctx.input.role
    });

    return {
      output: {
        memberId: member.id?.toString(),
        role: member.role ?? undefined
      },
      message: `Updated member ${ctx.input.memberId} role to **${ctx.input.role}** on board ${ctx.input.boardId}.`
    };
  })
  .build();

export let removeBoardMember = SlateTool.create(spec, {
  name: 'Remove Board Member',
  key: 'remove_board_member',
  description: `Removes a member from a Miro board, revoking their access.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board'),
      memberId: z.string().describe('ID of the member to remove')
    })
  )
  .output(
    z.object({
      removed: z.boolean().describe('Whether the member was removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    await client.removeBoardMember(ctx.input.boardId, ctx.input.memberId);

    return {
      output: { removed: true },
      message: `Removed member ${ctx.input.memberId} from board ${ctx.input.boardId}.`
    };
  })
  .build();
