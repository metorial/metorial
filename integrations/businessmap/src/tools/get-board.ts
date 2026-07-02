import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let columnSchema = z.object({
  columnId: z.number().describe('Column ID'),
  workflowId: z.number().optional().describe('Workflow ID'),
  section: z.number().optional().describe('Section type (1=Backlog, 2=In Progress, 3=Done)'),
  parentColumnId: z
    .number()
    .optional()
    .nullable()
    .describe('Parent column ID for sub-columns'),
  position: z.number().optional().describe('Column position'),
  name: z.string().optional().describe('Column name'),
  description: z.string().optional().describe('Column description'),
  color: z.string().optional().describe('Column color'),
  limit: z.number().optional().describe('WIP limit')
});

let laneSchema = z.object({
  laneId: z.number().describe('Lane ID'),
  workflowId: z.number().optional().describe('Workflow ID'),
  parentLaneId: z.number().optional().nullable().describe('Parent lane ID'),
  position: z.number().optional().describe('Lane position'),
  name: z.string().optional().describe('Lane name'),
  description: z.string().optional().describe('Lane description'),
  color: z.string().optional().describe('Lane color')
});

let workflowSchema = z.object({
  workflowId: z.number().describe('Workflow ID'),
  type: z.number().optional().describe('Workflow type (1=Cards, 2=Initiatives)'),
  name: z.string().optional().describe('Workflow name'),
  position: z.number().optional().describe('Workflow position'),
  isEnabled: z.number().optional().describe('Whether the workflow is enabled')
});

export let getBoardTool = SlateTool.create(spec, {
  name: 'Get Board Details',
  key: 'get_board',
  description: `Retrieve detailed information about a specific board, including its workflows, columns, and lanes. Use this to understand a board's full structure before creating or moving cards.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.number().describe('The ID of the board to retrieve'),
      includeStructure: z
        .boolean()
        .optional()
        .describe('Include workflows, columns, and lanes. Defaults to true.')
    })
  )
  .output(
    z.object({
      boardId: z.number().describe('Board ID'),
      workspaceId: z.number().optional().describe('Workspace ID'),
      name: z.string().optional().describe('Board name'),
      description: z.string().optional().describe('Board description'),
      isArchived: z.number().optional().describe('Whether the board is archived'),
      workflows: z.array(workflowSchema).optional().describe('Board workflows'),
      columns: z.array(columnSchema).optional().describe('Board columns'),
      lanes: z.array(laneSchema).optional().describe('Board lanes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    let board = await client.getBoard(ctx.input.boardId);
    let includeStructure = ctx.input.includeStructure !== false;

    let workflows: any[] = [];
    let columns: any[] = [];
    let lanes: any[] = [];

    if (includeStructure) {
      [workflows, columns, lanes] = await Promise.all([
        client.getBoardWorkflows(ctx.input.boardId),
        client.getBoardColumns(ctx.input.boardId),
        client.getBoardLanes(ctx.input.boardId)
      ]);
    }

    return {
      output: {
        boardId: board.board_id,
        workspaceId: board.workspace_id,
        name: board.name,
        description: board.description,
        isArchived: board.is_archived,
        workflows: includeStructure
          ? (workflows ?? []).map((w: any) => ({
              workflowId: w.workflow_id,
              type: w.type,
              name: w.name,
              position: w.position,
              isEnabled: w.is_enabled
            }))
          : undefined,
        columns: includeStructure
          ? (columns ?? []).map((c: any) => ({
              columnId: c.column_id,
              workflowId: c.workflow_id,
              section: c.section,
              parentColumnId: c.parent_column_id,
              position: c.position,
              name: c.name,
              description: c.description,
              color: c.color,
              limit: c.limit
            }))
          : undefined,
        lanes: includeStructure
          ? (lanes ?? []).map((l: any) => ({
              laneId: l.lane_id,
              workflowId: l.workflow_id,
              parentLaneId: l.parent_lane_id,
              position: l.position,
              name: l.name,
              description: l.description,
              color: l.color
            }))
          : undefined
      },
      message: `Retrieved board **${board.name ?? ctx.input.boardId}**${includeStructure ? ` with ${(workflows ?? []).length} workflow(s), ${(columns ?? []).length} column(s), and ${(lanes ?? []).length} lane(s)` : ''}.`
    };
  })
  .build();
