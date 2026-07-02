import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let macroSchema = z.object({
  id: z.string().describe('Macro ID'),
  name: z.string().describe('Macro name'),
  visibility: z.enum(['private', 'shared']).optional().describe('Macro visibility'),
  actions: z.array(z.any()).optional().describe('Macro actions'),
  createdAt: z.string().optional().describe('When the macro was created'),
  updatedAt: z.string().optional().describe('When the macro was last updated')
});

let mapMacro = (macro: any) => ({
  id: macro.id,
  name: macro.name,
  visibility: macro.visibility,
  actions: macro.actions,
  createdAt: macro.createdAt,
  updatedAt: macro.updatedAt
});

export let manageMacros = SlateTool.create(spec, {
  name: 'Manage Macros',
  key: 'manage_macros',
  description: `Manage HelpDesk macros. Supports listing all macros, getting a specific macro by ID, creating new macros, updating existing macros, and deleting macros. Macros are reusable sets of actions that can be applied to tickets.`,
  tags: { readOnly: false }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('The action to perform on macros'),
      macroId: z
        .string()
        .optional()
        .describe('Macro ID (required for get, update, and delete actions)'),
      name: z
        .string()
        .optional()
        .describe('Macro name (required for create, optional for update)'),
      visibility: z
        .enum(['private', 'shared'])
        .optional()
        .describe('Macro visibility (for create or update)'),
      actions: z
        .array(z.any())
        .optional()
        .describe('Array of action objects the macro will execute (for create or update)')
    })
  )
  .output(
    z.object({
      macro: macroSchema
        .optional()
        .describe('A single macro (for get, create, update actions)'),
      macros: z.array(macroSchema).optional().describe('List of macros (for list action)'),
      success: z.boolean().optional().describe('Whether the delete action succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let macros = await client.listMacros();
      let mapped = macros.map(mapMacro);
      return {
        output: { macros: mapped },
        message: `Found **${mapped.length}** macros.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.macroId) {
        throw new Error('macroId is required for the get action.');
      }
      let macro = await client.getMacro(ctx.input.macroId);
      return {
        output: { macro: mapMacro(macro) },
        message: `Retrieved macro **${macro.name}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) {
        throw new Error('name is required for the create action.');
      }
      let macro = await client.createMacro({
        name: ctx.input.name,
        visibility: ctx.input.visibility,
        actions: ctx.input.actions
      });
      return {
        output: { macro: mapMacro(macro) },
        message: `Created macro **${macro.name}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.macroId) {
        throw new Error('macroId is required for the update action.');
      }
      let input: Record<string, any> = {};
      if (ctx.input.name !== undefined) input.name = ctx.input.name;
      if (ctx.input.visibility !== undefined) input.visibility = ctx.input.visibility;
      if (ctx.input.actions !== undefined) input.actions = ctx.input.actions;

      let macro = await client.updateMacro(ctx.input.macroId, input);
      return {
        output: { macro: mapMacro(macro) },
        message: `Updated macro **${macro.name}**.`
      };
    }

    // delete
    if (!ctx.input.macroId) {
      throw new Error('macroId is required for the delete action.');
    }
    await client.deleteMacro(ctx.input.macroId);
    return {
      output: { success: true },
      message: `Deleted macro **${ctx.input.macroId}**.`
    };
  })
  .build();
