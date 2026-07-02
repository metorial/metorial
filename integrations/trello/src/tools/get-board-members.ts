import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { spec } from '../spec';

let memberSchema = z.object({
  memberId: z.string().describe('Member ID'),
  fullName: z.string().optional().describe('Full name'),
  username: z.string().optional().describe('Username'),
  avatarUrl: z.string().optional().describe('Avatar image URL')
});

export let getBoardMembers = SlateTool.create(spec, {
  name: 'Get Board Members',
  key: 'get_board_members',
  description: `List all members of a Trello board. Use to discover member IDs for assigning to cards or managing board membership.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board to get members from')
    })
  )
  .output(
    z.object({
      members: z.array(memberSchema).describe('Board members')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });

    let rawMembers = await client.getBoardMembers(ctx.input.boardId);

    let members = rawMembers.map((m: any) => ({
      memberId: m.id,
      fullName: m.fullName,
      username: m.username,
      avatarUrl: m.avatarUrl || undefined
    }));

    return {
      output: { members },
      message: `Found **${members.length}** member(s) on the board.`
    };
  })
  .build();
