import { SlateTool } from 'slates';
import { z } from 'zod';
import { TrelloClient } from '../lib/client';
import {
  requireAtLeastOneTrelloField,
  requireTrelloString,
  requireTrelloValue,
  trelloServiceError
} from '../lib/errors';
import { spec } from '../spec';

let customFieldOptionSchema = z.object({
  optionId: z.string().describe('Custom field option ID'),
  text: z.string().optional().describe('Option display text'),
  color: z.string().optional().describe('Option color'),
  position: z.number().optional().describe('Option position')
});

let customFieldSchema = z.object({
  customFieldId: z.string().describe('Custom field ID'),
  boardId: z.string().optional().describe('Board ID'),
  name: z.string().optional().describe('Custom field name'),
  type: z.string().optional().describe('Custom field type'),
  position: z.number().optional().describe('Custom field position'),
  displayOnCardFront: z
    .boolean()
    .optional()
    .describe('Whether the field displays on card fronts'),
  options: z.array(customFieldOptionSchema).optional().describe('List field options')
});

let customFieldItemSchema = z.object({
  customFieldItemId: z.string().optional().describe('Custom field item ID, when returned'),
  customFieldId: z.string().describe('Custom field definition ID'),
  cardId: z.string().optional().describe('Card ID'),
  value: z.any().optional().describe('Custom field value payload'),
  optionId: z.string().optional().describe('Selected option ID for dropdown/list fields')
});

let mapCustomField = (field: any) => ({
  customFieldId: field.id,
  boardId: field.idModel,
  name: field.name || field.display?.name,
  type: field.type,
  position:
    typeof field.pos === 'number'
      ? field.pos
      : typeof field.display?.pos === 'number'
        ? field.display.pos
        : undefined,
  displayOnCardFront: field.display?.cardFront,
  options: field.options?.map((option: any) => ({
    optionId: option.id,
    text: option.value?.text,
    color: option.color || undefined,
    position: option.pos
  }))
});

let mapCustomFieldItem = (
  item: any,
  fallback?: {
    cardId: string;
    customFieldId: string;
    value?: Record<string, any>;
    optionId?: string;
  }
) => ({
  customFieldItemId: item?.id,
  customFieldId: item?.idCustomField || fallback?.customFieldId,
  cardId: item?.idModel || fallback?.cardId,
  value: item?.value || fallback?.value,
  optionId: item?.idValue || fallback?.optionId
});

let buildCustomFieldValue = (input: {
  valueType?: 'text' | 'number' | 'date' | 'checked' | 'option';
  textValue?: string;
  numberValue?: string;
  dateValue?: string;
  checked?: boolean;
  optionId?: string;
}) => {
  switch (input.valueType) {
    case 'text':
      return {
        value: { text: requireTrelloString(input.textValue, 'textValue', 'set_card_value') }
      };
    case 'number':
      return {
        value: {
          number: requireTrelloString(input.numberValue, 'numberValue', 'set_card_value')
        }
      };
    case 'date':
      return {
        value: { date: requireTrelloString(input.dateValue, 'dateValue', 'set_card_value') }
      };
    case 'checked':
      return {
        value: {
          checked: requireTrelloValue(input.checked, 'checked', 'set_card_value')
        }
      };
    case 'option':
      return { idValue: requireTrelloString(input.optionId, 'optionId', 'set_card_value') };
    default:
      throw trelloServiceError('valueType is required for "set_card_value".');
  }
};

export let manageCustomFields = SlateTool.create(spec, {
  name: 'Manage Custom Fields',
  key: 'manage_custom_fields',
  description: `List, create, update, or delete Trello custom fields on a board, and read or set custom field values on cards.`,
  instructions: [
    'Use action "list_board_fields" with boardId to retrieve custom field definitions.',
    'Use action "create_field" with boardId, name, and fieldType to create a field definition.',
    'Use action "update_field" with customFieldId and at least one field to change.',
    'Use action "delete_field" with customFieldId to remove a custom field definition.',
    'Use action "get_card_items" with cardId to retrieve custom field values for a card.',
    'Use action "set_card_value" with cardId, customFieldId, valueType, and the matching value field.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_board_fields',
          'create_field',
          'update_field',
          'delete_field',
          'get_card_items',
          'set_card_value'
        ])
        .describe('Action to perform'),
      boardId: z
        .string()
        .optional()
        .describe('Board ID (required for list_board_fields and create_field)'),
      cardId: z
        .string()
        .optional()
        .describe('Card ID (required for get_card_items and set_card_value)'),
      customFieldId: z
        .string()
        .optional()
        .describe(
          'Custom field ID (required for update_field, delete_field, and set_card_value)'
        ),
      name: z.string().optional().describe('Custom field name for create_field/update_field'),
      fieldType: z
        .enum(['checkbox', 'date', 'list', 'number', 'text'])
        .optional()
        .describe('Custom field type (required for create_field)'),
      position: z.string().optional().describe('Field position: "top", "bottom", or a number'),
      displayOnCardFront: z
        .boolean()
        .optional()
        .describe('Whether to show the field on card fronts'),
      valueType: z
        .enum(['text', 'number', 'date', 'checked', 'option'])
        .optional()
        .describe('Value kind for set_card_value'),
      textValue: z.string().optional().describe('Text value when valueType is "text"'),
      numberValue: z
        .string()
        .optional()
        .describe('Number value as a string when valueType is "number"'),
      dateValue: z
        .string()
        .optional()
        .describe('ISO 8601 date value when valueType is "date"'),
      checked: z.boolean().optional().describe('Checkbox value when valueType is "checked"'),
      optionId: z
        .string()
        .optional()
        .describe('Dropdown/list option ID when valueType is "option"')
    })
  )
  .output(
    z.object({
      fields: z
        .array(customFieldSchema)
        .optional()
        .describe('Custom field definitions for list_board_fields'),
      field: customFieldSchema.optional().describe('Created or updated custom field'),
      items: z
        .array(customFieldItemSchema)
        .optional()
        .describe('Custom field values for get_card_items'),
      item: customFieldItemSchema.optional().describe('Set custom field item value'),
      deleted: z.boolean().optional().describe('Whether a delete action completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TrelloClient({ apiKey: ctx.auth.apiKey, token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list_board_fields') {
      let boardId = requireTrelloString(ctx.input.boardId, 'boardId', action);
      let rawFields = await client.getBoardCustomFields(boardId);
      let fields = rawFields.map(mapCustomField);

      return {
        output: { fields },
        message: `Found **${fields.length}** custom field(s).`
      };
    }

    if (action === 'create_field') {
      let boardId = requireTrelloString(ctx.input.boardId, 'boardId', action);
      let name = requireTrelloString(ctx.input.name, 'name', action);
      let fieldType = requireTrelloString(ctx.input.fieldType, 'fieldType', action);
      let field = await client.createCustomField({
        boardId,
        name,
        type: fieldType,
        pos: ctx.input.position,
        display_cardFront: ctx.input.displayOnCardFront
      });

      return {
        output: { field: mapCustomField(field) },
        message: `Created custom field **${field.display?.name || field.name || name}**.`
      };
    }

    if (action === 'update_field') {
      let customFieldId = requireTrelloString(
        ctx.input.customFieldId,
        'customFieldId',
        action
      );
      requireAtLeastOneTrelloField(
        {
          name: ctx.input.name,
          position: ctx.input.position,
          displayOnCardFront: ctx.input.displayOnCardFront
        },
        'custom field field to update',
        action
      );

      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.position !== undefined) updateData.pos = ctx.input.position;
      if (ctx.input.displayOnCardFront !== undefined)
        updateData['display/cardFront'] = ctx.input.displayOnCardFront;

      let field = await client.updateCustomField(customFieldId, updateData);

      return {
        output: { field: mapCustomField(field) },
        message: `Updated custom field \`${customFieldId}\`.`
      };
    }

    if (action === 'delete_field') {
      let customFieldId = requireTrelloString(
        ctx.input.customFieldId,
        'customFieldId',
        action
      );
      await client.deleteCustomField(customFieldId);

      return {
        output: { deleted: true },
        message: `Deleted custom field \`${customFieldId}\`.`
      };
    }

    if (action === 'get_card_items') {
      let cardId = requireTrelloString(ctx.input.cardId, 'cardId', action);
      let rawItems = await client.getCardCustomFieldItems(cardId);
      let items = rawItems.map((item: any) => mapCustomFieldItem(item));

      return {
        output: { items },
        message: `Found **${items.length}** custom field value(s).`
      };
    }

    let cardId = requireTrelloString(ctx.input.cardId, 'cardId', action);
    let customFieldId = requireTrelloString(ctx.input.customFieldId, 'customFieldId', action);
    let valuePayload = buildCustomFieldValue(ctx.input);
    await client.setCardCustomFieldValue(cardId, customFieldId, valuePayload);
    let rawItems = await client.getCardCustomFieldItems(cardId);
    let matchingItem = rawItems.find((item: any) => item.idCustomField === customFieldId);

    return {
      output: {
        item: mapCustomFieldItem(matchingItem, {
          cardId,
          customFieldId,
          value: valuePayload.value,
          optionId: valuePayload.idValue
        })
      },
      message: `Set custom field \`${customFieldId}\` on card \`${cardId}\`.`
    };
  })
  .build();
