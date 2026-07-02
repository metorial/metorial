import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let modifierOptionSchema = z.object({
  modifierOptionId: z.string().optional().describe('Option ID'),
  optionName: z.string().optional().describe('Option name (e.g., Small, Medium, Large)'),
  price: z.number().optional().describe('Price adjustment for this option'),
  position: z.number().optional().describe('Display position')
});

let modifierSchema = z.object({
  modifierId: z.string().describe('Modifier ID'),
  modifierName: z.string().optional().describe('Modifier name (e.g., Size)'),
  options: z.array(modifierOptionSchema).optional().describe('Available options'),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().nullable().optional()
});

export let listModifiers = SlateTool.create(spec, {
  name: 'List Modifiers',
  key: 'list_modifiers',
  description: `Retrieve all item modifiers (e.g., "Size" with options Small/Medium/Large). Modifiers add selectable options with price adjustments to items.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      limit: z.number().min(1).max(250).optional(),
      cursor: z.string().optional()
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
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let modifiers = (result.modifiers ?? []).map((m: any) => ({
      modifierId: m.id,
      modifierName: m.name,
      options: (m.options ?? []).map((o: any) => ({
        modifierOptionId: o.id,
        optionName: o.name,
        price: o.price,
        position: o.position
      })),
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      deletedAt: m.deleted_at
    }));

    return {
      output: { modifiers, cursor: result.cursor },
      message: `Retrieved **${modifiers.length}** modifier(s).`
    };
  })
  .build();

export let createOrUpdateModifier = SlateTool.create(spec, {
  name: 'Create or Update Modifier',
  key: 'create_or_update_modifier',
  description: `Create a new modifier or update an existing one. Modifiers define selectable options (e.g., Size: S/M/L) with optional price adjustments.`
})
  .input(
    z.object({
      modifierId: z.string().optional().describe('Modifier ID to update; omit to create'),
      modifierName: z.string().optional().describe('Modifier name'),
      options: z
        .array(
          z.object({
            modifierOptionId: z
              .string()
              .optional()
              .describe('Option ID to update; omit for new option'),
            optionName: z.string().optional().describe('Option name'),
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

    let body: any = {};
    if (ctx.input.modifierId) body.id = ctx.input.modifierId;
    if (ctx.input.modifierName !== undefined) body.name = ctx.input.modifierName;
    if (ctx.input.options) {
      body.options = ctx.input.options.map(o => {
        let opt: any = {};
        if (o.modifierOptionId) opt.id = o.modifierOptionId;
        if (o.optionName !== undefined) opt.name = o.optionName;
        if (o.price !== undefined) opt.price = o.price;
        if (o.position !== undefined) opt.position = o.position;
        return opt;
      });
    }

    let result = await client.createOrUpdateModifier(body);
    let isUpdate = !!ctx.input.modifierId;

    return {
      output: {
        modifierId: result.id,
        modifierName: result.name,
        options: (result.options ?? []).map((o: any) => ({
          modifierOptionId: o.id,
          optionName: o.name,
          price: o.price,
          position: o.position
        })),
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        deletedAt: result.deleted_at
      },
      message: `${isUpdate ? 'Updated' : 'Created'} modifier **${result.name}**.`
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
