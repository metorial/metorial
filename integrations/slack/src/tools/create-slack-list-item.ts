import { SlateTool } from 'slates';
import { z } from 'zod';
import { SlackClient } from '../lib/client';
import { slackServiceError } from '../lib/errors';
import { slackActionScopes } from '../lib/scopes';
import { spec } from '../spec';

let arbitraryObjectSchema = z.record(z.string(), z.unknown());

let richTextSchema = z.union([arbitraryObjectSchema, z.array(arbitraryObjectSchema).min(1)]);

let initialFieldSchema = z
  .object({
    column_id: z.string().trim().min(1).describe('Existing Slack List column ID'),
    rich_text: richTextSchema
      .optional()
      .describe('Slack Block Kit rich-text value for a text column')
  })
  .catchall(z.unknown());

let validateInitialFields = (fields: Record<string, unknown>[]) => {
  let columnIds = new Set<string>();

  fields.forEach((field, index) => {
    if ('row_id' in field || 'row_id_to_create' in field) {
      throw slackServiceError(
        `initialFields[${index}] must not contain row_id or row_id_to_create; Slack creates the new row ID`
      );
    }

    if ('text' in field) {
      throw slackServiceError(
        `initialFields[${index}] uses text; Slack List text cells require a rich_text value`
      );
    }

    let valueKeys = Object.keys(field).filter(key => key !== 'column_id');
    if (valueKeys.length !== 1) {
      throw slackServiceError(
        `initialFields[${index}] must contain column_id and exactly one typed value`
      );
    }

    if (field[valueKeys[0]!] === undefined) {
      throw slackServiceError(`initialFields[${index}] typed value must be defined`);
    }

    let columnId = field.column_id as string;
    if (columnIds.has(columnId)) {
      throw slackServiceError(
        `initialFields contains duplicate values for column_id ${columnId}`
      );
    }
    columnIds.add(columnId);
  });
};

export let createSlackListItem = SlateTool.create(spec, {
  name: 'Create Slack List Item',
  key: 'create_slack_list_item',
  description:
    'Create one new row in an existing Slack List with optional typed field values.',
  instructions: [
    'Use column_id values from the List schema or list_slack_list_items output.',
    'Each initialFields entry must contain one existing column_id and exactly one typed value.',
    'For text columns, pass Slack Block Kit rich-text content in rich_text. Plain text is not accepted as a text-cell substitute.'
  ],
  constraints: [
    'This tool creates a new row. Do not provide row_id or row_id_to_create.',
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
      initialFields: z
        .array(initialFieldSchema)
        .min(1)
        .optional()
        .describe('Initial typed values, one object per target column')
    })
  )
  .output(
    z.object({
      listId: z.string().describe('Slack List ID'),
      itemId: z.string().describe('Stable ID of the created List item'),
      rowId: z.string().describe('Stable row ID for later cell updates'),
      fields: z
        .array(arbitraryObjectSchema)
        .optional()
        .describe('Typed field values returned by Slack'),
      cells: z
        .array(arbitraryObjectSchema)
        .optional()
        .describe('Typed cells returned by Slack')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.initialFields) validateInitialFields(ctx.input.initialFields);

    let item = await new SlackClient(ctx.auth.token).createSlackListItem({
      listId: ctx.input.listId,
      initialFields: ctx.input.initialFields
    });
    let itemId = item.item_id ?? item.id ?? item.row_id;
    let rowId = item.row_id ?? item.id ?? item.item_id;
    if (!itemId || !rowId) {
      throw slackServiceError('Slack did not return a stable ID for the created List item');
    }

    return {
      output: {
        listId: ctx.input.listId,
        itemId,
        rowId,
        fields: item.fields,
        cells: item.cells
      },
      message: `Created Slack List item \`${itemId}\` in List \`${ctx.input.listId}\`.`
    };
  })
  .build();
