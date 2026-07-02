import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import { spec } from '../spec';

let boardSchema = z.object({
  boardId: z.string().describe('Unique board ID'),
  name: z.string().describe('Board name'),
  description: z.string().optional().describe('Board description'),
  closed: z.boolean().describe('Whether the board is archived'),
  url: z.string().describe('Full URL to the board'),
  shortUrl: z.string().optional().describe('Short URL to the board'),
  organizationId: z.string().optional().describe('ID of the workspace this board belongs to')
});

export let getBoards = SlateTool.create(spec, {
  name: 'Get Boards',
  key: 'get_boards',
  description: `List all boards accessible to the authenticated user, or boards belonging to a specific member or workspace. Use to discover board IDs needed by other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      memberId: z
        .string()
        .optional()
        .describe('Member ID to list boards for. Defaults to the authenticated user ("me")'),
      organizationId: z
        .string()
        .optional()
        .describe(
          'Workspace/organization ID to list boards for. If provided, lists boards from this workspace instead'
        ),
      filter: z
        .enum(['open', 'closed', 'all'])
        .optional()
        .describe('Filter boards by status. Defaults to "open"')
    })
  )
  .output(
    z.object({
      boards: z.array(boardSchema).describe('List of boards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });

    let rawBoards: any[];
    if (ctx.input.organizationId) {
      rawBoards = await client.getOrganizationBoards(
        ctx.input.organizationId,
        ctx.input.filter
      );
    } else {
      rawBoards = await client.getBoards(ctx.input.memberId || 'me', ctx.input.filter);
    }

    let boards = rawBoards.map((b: any) => ({
      boardId: b.id,
      name: b.name,
      description: b.desc || undefined,
      closed: b.closed ?? false,
      url: b.url,
      shortUrl: b.shortUrl,
      organizationId: b.idOrganization || undefined
    }));

    return {
      output: { boards },
      message: `Found **${boards.length}** board(s).`
    };
  })
  .build();
