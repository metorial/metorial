import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZeplinClient } from '../lib/client';
import { spec } from '../spec';

export let listFlowBoards = SlateTool.create(spec, {
  name: 'List Flow Boards',
  key: 'list_flow_boards',
  description: `List all flow boards in a Zeplin project. Flow boards represent user journey maps or navigation diagrams. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of results per page (1-100, default: 30)'),
      offset: z.number().min(0).optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      flowBoards: z.array(z.any()).describe('List of flow boards')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let flowBoards = (await client.listFlowBoards(ctx.input.projectId, {
      limit: ctx.input.limit,
      offset: ctx.input.offset
    })) as any[];

    return {
      output: { flowBoards },
      message: `Found **${flowBoards.length}** flow board(s).`
    };
  })
  .build();

export let getFlowBoard = SlateTool.create(spec, {
  name: 'Get Flow Board',
  key: 'get_flow_board',
  description: `Retrieve a specific flow board from a Zeplin project, including its nodes and connectors that define user journey maps and navigation diagrams.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('ID of the project'),
      flowBoardId: z.string().describe('ID of the flow board')
    })
  )
  .output(
    z.object({
      flowBoard: z.any().describe('Flow board details'),
      nodes: z
        .array(z.any())
        .describe('Flow board nodes (screens, shapes, text, annotations)'),
      connectors: z.array(z.any()).describe('Connectors between nodes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ZeplinClient(ctx.auth.token);

    let [flowBoard, nodes, connectors] = await Promise.all([
      client.getFlowBoard(ctx.input.projectId, ctx.input.flowBoardId),
      client.listFlowBoardNodes(ctx.input.projectId, ctx.input.flowBoardId),
      client.listFlowBoardConnectors(ctx.input.projectId, ctx.input.flowBoardId)
    ]);

    return {
      output: {
        flowBoard,
        nodes: nodes as any[],
        connectors: connectors as any[]
      },
      message: `Retrieved flow board with **${(nodes as any[]).length}** node(s) and **${(connectors as any[]).length}** connector(s).`
    };
  })
  .build();
