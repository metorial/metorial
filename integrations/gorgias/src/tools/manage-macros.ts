import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listMacros = SlateTool.create(spec, {
  name: 'List Macros',
  key: 'list_macros',
  description: `Retrieve a paginated list of macro templates. Macros are reusable response templates with configurable actions.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor'),
      limit: z.number().optional().describe('Number of macros to return')
    })
  )
  .output(
    z.object({
      macros: z.array(
        z.object({
          macroId: z.number().describe('Macro ID'),
          name: z.string().describe('Macro name'),
          actions: z.array(z.any()).describe('Macro actions'),
          createdDatetime: z.string().nullable().describe('When the macro was created')
        })
      ),
      nextCursor: z.string().nullable().describe('Cursor for the next page'),
      prevCursor: z.string().nullable().describe('Cursor for the previous page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let result = await client.listMacros({
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let macros = result.data.map((m: any) => ({
      macroId: m.id,
      name: m.name,
      actions: m.actions || [],
      createdDatetime: m.created_datetime || null
    }));

    return {
      output: {
        macros,
        nextCursor: result.meta.next_cursor,
        prevCursor: result.meta.prev_cursor
      },
      message: `Found **${macros.length}** macro(s).`
    };
  })
  .build();

export let createMacro = SlateTool.create(spec, {
  name: 'Create Macro',
  key: 'create_macro',
  description: `Create a new macro template with a name and a set of actions that will be executed when the macro is applied.`
})
  .input(
    z.object({
      name: z.string().describe('Macro name'),
      actions: z
        .array(
          z.object({
            type: z
              .string()
              .describe('Action type (e.g., "set-status", "add-tag", "send-message")'),
            args: z.any().optional().describe('Action arguments')
          })
        )
        .optional()
        .describe('Actions to execute when the macro is applied')
    })
  )
  .output(
    z.object({
      macroId: z.number().describe('ID of the created macro'),
      name: z.string().describe('Macro name'),
      actions: z.array(z.any()).describe('Configured actions')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let macro = await client.createMacro({
      name: ctx.input.name,
      actions: ctx.input.actions
    });

    return {
      output: {
        macroId: macro.id,
        name: macro.name,
        actions: macro.actions || []
      },
      message: `Created macro **"${macro.name}"** (ID: ${macro.id}).`
    };
  })
  .build();

export let updateMacro = SlateTool.create(spec, {
  name: 'Update Macro',
  key: 'update_macro',
  description: `Update an existing macro's name or actions.`
})
  .input(
    z.object({
      macroId: z.number().describe('ID of the macro to update'),
      name: z.string().optional().describe('New macro name'),
      actions: z
        .array(
          z.object({
            type: z.string().describe('Action type'),
            args: z.any().optional().describe('Action arguments')
          })
        )
        .optional()
        .describe('Updated actions')
    })
  )
  .output(
    z.object({
      macroId: z.number().describe('Macro ID'),
      name: z.string().describe('Updated macro name'),
      actions: z.array(z.any()).describe('Updated actions')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);

    let data: any = {};
    if (ctx.input.name) data.name = ctx.input.name;
    if (ctx.input.actions) data.actions = ctx.input.actions;

    let macro = await client.updateMacro(ctx.input.macroId, data);

    return {
      output: {
        macroId: macro.id,
        name: macro.name,
        actions: macro.actions || []
      },
      message: `Updated macro **"${macro.name}"** (ID: ${macro.id}).`
    };
  })
  .build();

export let deleteMacro = SlateTool.create(spec, {
  name: 'Delete Macro',
  key: 'delete_macro',
  description: `Permanently delete a macro template.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      macroId: z.number().describe('ID of the macro to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the macro was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteMacro(ctx.input.macroId);

    return {
      output: { deleted: true },
      message: `Deleted macro **#${ctx.input.macroId}**.`
    };
  })
  .build();
