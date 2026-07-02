import { SlateTool } from 'slates';
import { z } from 'zod';
import { MiroClient } from '../lib/client';
import { spec } from '../spec';

export let createConnector = SlateTool.create(spec, {
  name: 'Create Connector',
  key: 'create_connector',
  description: `Creates a connector (line) between two items on a Miro board. Both start and end items must already exist on the board. Supports straight, elbowed, and curved connector shapes.`,
  instructions: [
    'Both startItemId and endItemId are required — connectors must connect two existing items.',
    'Shape options: straight, elbowed, curved.',
    'Stroke cap options: none, stealth, diamond, diamond_filled, oval, oval_filled, arrow, triangle, triangle_filled, erd_one, erd_many, erd_one_or_many, erd_only_one, erd_zero_or_many, erd_zero_or_one.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board'),
      startItemId: z.string().describe('ID of the item where the connector starts'),
      endItemId: z.string().describe('ID of the item where the connector ends'),
      shape: z
        .enum(['straight', 'elbowed', 'curved'])
        .optional()
        .describe('Shape of the connector line'),
      captionContent: z
        .string()
        .optional()
        .describe('Text caption to display on the connector'),
      strokeColor: z
        .string()
        .optional()
        .describe('Color of the connector line (hex, e.g., "#000000")'),
      strokeWidth: z.string().optional().describe('Width of the connector line'),
      strokeStyle: z.string().optional().describe('Line style: normal, dashed, dotted'),
      startStrokeCap: z.string().optional().describe('Cap at the start of the connector'),
      endStrokeCap: z.string().optional().describe('Cap at the end of the connector')
    })
  )
  .output(
    z.object({
      connectorId: z.string().describe('ID of the created connector'),
      startItemId: z.string().optional().describe('Start item ID'),
      endItemId: z.string().optional().describe('End item ID'),
      shape: z.string().optional().describe('Connector shape')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });

    let style: any;
    if (
      ctx.input.strokeColor ||
      ctx.input.strokeWidth ||
      ctx.input.strokeStyle ||
      ctx.input.startStrokeCap ||
      ctx.input.endStrokeCap
    ) {
      style = {};
      if (ctx.input.strokeColor) style.strokeColor = ctx.input.strokeColor;
      if (ctx.input.strokeWidth) style.strokeWidth = ctx.input.strokeWidth;
      if (ctx.input.strokeStyle) style.strokeStyle = ctx.input.strokeStyle;
      if (ctx.input.startStrokeCap) style.startStrokeCap = ctx.input.startStrokeCap;
      if (ctx.input.endStrokeCap) style.endStrokeCap = ctx.input.endStrokeCap;
    }

    let captions = ctx.input.captionContent
      ? [{ content: ctx.input.captionContent }]
      : undefined;

    let connector = await client.createConnector(ctx.input.boardId, {
      startItemId: ctx.input.startItemId,
      endItemId: ctx.input.endItemId,
      shape: ctx.input.shape,
      captions,
      style
    });

    return {
      output: {
        connectorId: connector.id,
        startItemId: connector.startItem?.id,
        endItemId: connector.endItem?.id,
        shape: connector.shape
      },
      message: `Created connector (ID: ${connector.id}) from item ${ctx.input.startItemId} to item ${ctx.input.endItemId}.`
    };
  })
  .build();

export let getConnectors = SlateTool.create(spec, {
  name: 'Get Connectors',
  key: 'get_connectors',
  description: `Retrieves connectors from a Miro board. Can fetch all connectors or a single connector by ID. Supports pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board'),
      connectorId: z
        .string()
        .optional()
        .describe('If provided, retrieves a single connector by ID'),
      limit: z.number().optional().describe('Maximum number of connectors to return'),
      cursor: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      connectors: z
        .array(
          z.object({
            connectorId: z.string().describe('Connector ID'),
            startItemId: z.string().optional().describe('Start item ID'),
            endItemId: z.string().optional().describe('End item ID'),
            shape: z.string().optional().describe('Connector shape'),
            captionContent: z.string().optional().describe('Caption text'),
            createdAt: z.string().optional().describe('Creation timestamp'),
            modifiedAt: z.string().optional().describe('Last modification timestamp')
          })
        )
        .describe('List of connectors'),
      cursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });

    if (ctx.input.connectorId) {
      let connector = await client.getConnector(ctx.input.boardId, ctx.input.connectorId);
      return {
        output: {
          connectors: [mapConnector(connector)],
          cursor: undefined
        },
        message: `Retrieved connector ${connector.id}.`
      };
    }

    let result = await client.getConnectors(ctx.input.boardId, {
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let connectors = (result.data || []).map(mapConnector);

    return {
      output: {
        connectors,
        cursor: result.cursor
      },
      message: `Found **${connectors.length}** connector(s) on board ${ctx.input.boardId}.`
    };
  })
  .build();

export let deleteConnector = SlateTool.create(spec, {
  name: 'Delete Connector',
  key: 'delete_connector',
  description: `Deletes a connector from a Miro board.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      boardId: z.string().describe('ID of the board'),
      connectorId: z.string().describe('ID of the connector to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the connector was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MiroClient({ token: ctx.auth.token });
    await client.deleteConnector(ctx.input.boardId, ctx.input.connectorId);

    return {
      output: { deleted: true },
      message: `Deleted connector ${ctx.input.connectorId} from board ${ctx.input.boardId}.`
    };
  })
  .build();

let mapConnector = (connector: any) => ({
  connectorId: connector.id,
  startItemId: connector.startItem?.id,
  endItemId: connector.endItem?.id,
  shape: connector.shape,
  captionContent: connector.captions?.[0]?.content,
  createdAt: connector.createdAt,
  modifiedAt: connector.modifiedAt
});
