import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, joinIds } from '../lib/client';
import { pickWritable, requireForCreate } from '../lib/upsert';
import { spec } from '../spec';

let modifierOptionSchema = z.object({
  modifierOptionId: z.string().optional().describe('Option ID'),
  optionName: z.string().optional().describe('Option name (e.g., Small, Medium, Large)'),
  price: z.number().nullable().optional().describe('Price adjustment for this option'),
  position: z.number().nullable().optional().describe('Display position')
});

let modifierSchema = z.object({
  modifierId: z.string().describe('Modifier ID'),
  modifierName: z.string().optional().describe('Modifier name (e.g., Size)'),
  position: z.number().nullable().optional().describe('Position in the modifiers list'),
  storeIds: z.array(z.string()).optional().describe('Stores where the modifier is available'),
  options: z.array(modifierOptionSchema).optional().describe('Available options'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional()
});

let mapModifier = (m: any) => ({
  modifierId: m.id,
  modifierName: m.name,
  position: m.position,
  storeIds: m.stores ?? undefined,
  options: (m.modifier_options ?? m.options)?.map((o: any) => ({
    modifierOptionId: o.id,
    optionName: o.name,
    price: o.price,
    position: o.position
  })),
  createdAt: m.created_at,
  updatedAt: m.updated_at,
  deletedAt: m.deleted_at
});

export let listModifiers = SlateTool.create(spec, {
  name: 'List Modifiers',
  key: 'list_modifiers',
  description: `Retrieve item modifiers (e.g., "Size" with options Small/Medium/Large). Modifiers add selectable options with price adjustments to items.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      modifierIds: z
        .array(z.string())
        .optional()
        .describe('Only return modifiers with these IDs'),
      createdAtMin: z
        .string()
        .optional()
        .describe('Only return modifiers created at or after this ISO 8601 UTC timestamp'),
      createdAtMax: z
        .string()
        .optional()
        .describe('Only return modifiers created at or before this ISO 8601 UTC timestamp'),
      updatedAtMin: z
        .string()
        .optional()
        .describe('Only return modifiers updated at or after this ISO 8601 UTC timestamp'),
      updatedAtMax: z
        .string()
        .optional()
        .describe('Only return modifiers updated at or before this ISO 8601 UTC timestamp'),
      limit: z.number().min(1).max(250).optional().describe('Number of modifiers to return'),
      cursor: z.string().optional().describe('Pagination cursor'),
      showDeleted: z
        .boolean()
        .optional()
        .describe('Include deleted modifiers and modifier options')
    })
  )
  .output(
    z.object({
      modifiers: z.array(modifierSchema),
      cursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listModifiers({
      modifierIds: joinIds(ctx.input.modifierIds),
      createdAtMin: ctx.input.createdAtMin,
      createdAtMax: ctx.input.createdAtMax,
      updatedAtMin: ctx.input.updatedAtMin,
      updatedAtMax: ctx.input.updatedAtMax,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor,
      showDeleted: ctx.input.showDeleted
    });

    let modifiers = (result.modifiers ?? []).map(mapModifier);

    return {
      output: { modifiers, cursor: result.cursor },
      message: `Retrieved **${modifiers.length}** modifier(s).${result.cursor ? ' More available via cursor.' : ''}`
    };
  })
  .build();

export let createOrUpdateModifier = SlateTool.create(spec, {
  name: 'Create or Update Modifier',
  key: 'create_or_update_modifier',
  description: `Create a new modifier or update an existing one. Modifiers define selectable options (e.g., Size: S/M/L) with optional price adjustments. When updating, fields you omit keep their current values.`,
  instructions: [
    'modifierName and at least one option are required when creating a modifier.',
    'When options is provided it replaces the full option list: include modifierOptionId for options to keep or change, omit it for new options, and leave out options to remove.'
  ]
})
  .input(
    z.object({
      modifierId: z.string().optional().describe('Modifier ID to update; omit to create'),
      modifierName: z
        .string()
        .optional()
        .describe('Modifier name (required when creating, max 40 characters)'),
      position: z.number().optional().describe('Position in the modifiers list'),
      storeIds: z
        .array(z.string())
        .optional()
        .describe('Stores where the modifier is available'),
      options: z
        .array(
          z.object({
            modifierOptionId: z
              .string()
              .optional()
              .describe('Option ID to update; omit for new option'),
            optionName: z
              .string()
              .optional()
              .describe('Option name (required for new options)'),
            price: z.number().optional().describe('Price adjustment'),
            position: z.number().optional().describe('Display position')
          })
        )
        .optional()
        .describe('Modifier options')
    })
  )
  .output(modifierSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let input = ctx.input;
    let isUpdate = !!input.modifierId;

    let existingOptions: any[] = [];
    let body: any = {};
    if (isUpdate) {
      let existing = await client.getModifier(input.modifierId!);
      existingOptions = existing.modifier_options ?? [];
      body = pickWritable(existing, ['name', 'position', 'stores']);
      body.id = input.modifierId;
      body.modifier_options = existingOptions.map(o =>
        pickWritable(o, ['id', 'name', 'price', 'position'])
      );
    } else {
      requireForCreate(input.modifierName, 'modifierName', 'modifier');
      requireForCreate(input.options?.length || undefined, 'options', 'modifier');
    }

    if (input.modifierName !== undefined) body.name = input.modifierName;
    if (input.position !== undefined) body.position = input.position;
    if (input.storeIds !== undefined) body.stores = input.storeIds;
    if (input.options) {
      body.modifier_options = input.options.map(o => {
        let current = o.modifierOptionId
          ? existingOptions.find(eo => eo.id === o.modifierOptionId)
          : undefined;
        let opt: any = current
          ? pickWritable(current, ['id', 'name', 'price', 'position'])
          : {};
        if (o.modifierOptionId) opt.id = o.modifierOptionId;
        if (o.optionName !== undefined) opt.name = o.optionName;
        if (o.price !== undefined) opt.price = o.price;
        if (o.position !== undefined) opt.position = o.position;
        requireForCreate(opt.name, 'optionName', 'modifier option');
        return opt;
      });
    }

    let result = await client.createOrUpdateModifier(body);

    return {
      output: mapModifier(result),
      message: `${isUpdate ? 'Updated' : 'Created'} modifier **${result.name ?? result.id}**.`
    };
  })
  .build();

export let deleteModifier = SlateTool.create(spec, {
  name: 'Delete Modifier',
  key: 'delete_modifier',
  description: `Delete a modifier by its ID.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      modifierId: z.string().describe('ID of the modifier to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteModifier(ctx.input.modifierId);

    return {
      output: { deleted: true },
      message: `Deleted modifier \`${ctx.input.modifierId}\`.`
    };
  })
  .build();
