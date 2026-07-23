import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackServiceError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let arbitraryObjectSchema = z.record(z.string(), z.unknown());

let richTextSchema = z.union([arbitraryObjectSchema, z.array(arbitraryObjectSchema).min(1)]);

let updateCellSchema = z
  .object({
    row_id: z.string().trim().min(1).describe('Existing Slack List row ID'),
    column_id: z.string().trim().min(1).describe('Existing Slack List column ID'),
    rich_text: richTextSchema
      .optional()
      .describe('Replacement Slack Block Kit rich-text value for a text column')
  })
  .catchall(z.unknown());

let validateUpdateCells = (cells: Record<string, unknown>[]) => {
  let targets = new Set<string>();

  cells.forEach((cell, index) => {
    if ('row_id_to_create' in cell) {
      throw slackServiceError(
        `cells[${index}] must not contain row_id_to_create; use create_slack_list_item to create rows`
      );
    }

    if ('text' in cell) {
      throw slackServiceError(
        `cells[${index}] uses text; Slack List text cells require a rich_text value`
      );
    }

    let valueKeys = Object.keys(cell).filter(key => key !== 'row_id' && key !== 'column_id');
    if (valueKeys.length !== 1) {
      throw slackServiceError(
        `cells[${index}] must contain row_id, column_id, and exactly one typed replacement value`
      );
    }

    if (cell[valueKeys[0]!] === undefined) {
      throw slackServiceError(`cells[${index}] typed replacement value must be defined`);
    }

    let target = `${cell.row_id as string}\u0000${cell.column_id as string}`;
    if (targets.has(target)) {
      throw slackServiceError(
        `cells contains duplicate updates for row_id ${cell.row_id as string} and column_id ${cell.column_id as string}`
      );
    }
    targets.add(target);
  });
};

export let updateSlackListItems = SlateTool.create(spec, {
  name: 'Update Slack List Items',
  key: 'update_slack_list_items',
  description:
    'Replace one or more typed cell values in existing Slack List rows using stable row and column IDs.',
  instructions: [
    'Call list_slack_list_items first when you do not already have exact row_id and column_id values.',
    'Each cells entry must target one existing row_id and column_id and provide exactly one typed replacement value.',
    'For text columns, pass Slack Block Kit rich-text content in rich_text. Cell updates replace the existing typed value.'
  ],
  constraints: [
    'This tool updates existing rows only. row_id_to_create is rejected; use create_slack_list_item for creation.',
    'Duplicate updates to the same row and column in one invocation are rejected.',
    'Slack Lists are available only on supported paid workspace plans.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .scopes(slackActionScopes.listsWrite)
  .input(
    z.object({
      listId: z.string().trim().min(1).describe('Slack List ID'),
      cells: z
        .array(updateCellSchema)
        .min(1)
        .describe('Typed replacement cell values with existing row_id and column_id')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Slack List ID'),
      updatedCellCount: z
        .number()
        .int()
        .nonnegative()
        .describe('Number of requested cell updates')
    })
  )
  .handleInvocation(async ctx => {
    validateUpdateCells(ctx.input.cells);

    await new SlackClient(ctx.auth.token).updateSlackListItems({
      listId: ctx.input.listId,
      cells: ctx.input.cells
    });

    return {
      output: {
        listId: ctx.input.listId,
        updatedCellCount: ctx.input.cells.length
      },
      message: `Updated ${ctx.input.cells.length} cell(s) in Slack List \`${ctx.input.listId}\`.`
    };
  })
  .build();
