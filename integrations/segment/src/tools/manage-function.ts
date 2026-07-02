import { SlateTool } from 'slates';
import { z } from 'zod';
import { SegmentClient } from '../lib/client';
import { spec } from '../spec';

export let manageFunction = SlateTool.create(spec, {
  name: 'Manage Function',
  key: 'manage_function',
  description: `Create, update, list, or delete custom JavaScript functions. Functions run within Segment's infrastructure and can act as sources, destinations, or insert middleware to transform events.`,
  instructions: [
    'To create, provide displayName, code, and resourceType ("SOURCE", "DESTINATION", or "INSERT_DESTINATION").',
    'To update, provide functionId and fields to change.',
    'To delete, provide functionId and set action to "delete".'
  ],
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'list', 'get'])
        .describe('Operation to perform'),
      functionId: z
        .string()
        .optional()
        .describe('Function ID (required for update/delete/get)'),
      displayName: z.string().optional().describe('Display name for the function'),
      description: z.string().optional().describe('Description of what the function does'),
      code: z.string().optional().describe('JavaScript source code for the function'),
      resourceType: z
        .string()
        .optional()
        .describe(
          'Type: "SOURCE", "DESTINATION", or "INSERT_DESTINATION" (required for create)'
        ),
      settings: z
        .array(
          z.object({
            name: z.string().describe('Setting name'),
            label: z.string().describe('Setting display label'),
            description: z.string().optional().describe('Setting description'),
            type: z.string().describe('Setting type (e.g. "string", "boolean")'),
            required: z.boolean().optional().describe('Whether required')
          })
        )
        .optional()
        .describe('Function settings definitions')
    })
  )
  .output(
    z.object({
      functionId: z.string().optional().describe('Function ID'),
      displayName: z.string().optional().describe('Display name'),
      resourceType: z.string().optional().describe('Resource type'),
      deleted: z.boolean().optional().describe('Whether deleted'),
      functions: z
        .array(
          z.object({
            functionId: z.string().describe('Function ID'),
            displayName: z.string().optional().describe('Name'),
            resourceType: z.string().optional().describe('Type')
          })
        )
        .optional()
        .describe('List of functions (for list action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SegmentClient(ctx.auth.token, ctx.config.region);

    if (ctx.input.action === 'list') {
      let result = await client.listFunctions({ resourceType: ctx.input.resourceType });
      let functions = (result?.functions ?? []).map((f: any) => ({
        functionId: f.id,
        displayName: f.displayName,
        resourceType: f.resourceType
      }));
      return {
        output: { functions },
        message: `Found **${functions.length}** functions`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.functionId) throw new Error('functionId is required');
      let fn = await client.getFunction(ctx.input.functionId);
      return {
        output: {
          functionId: fn?.id,
          displayName: fn?.displayName,
          resourceType: fn?.resourceType
        },
        message: `Function **${fn?.displayName ?? ctx.input.functionId}**`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.displayName || !ctx.input.code || !ctx.input.resourceType) {
        throw new Error(
          'displayName, code, and resourceType are required to create a function'
        );
      }
      let fn = await client.createFunction({
        displayName: ctx.input.displayName,
        code: ctx.input.code,
        resourceType: ctx.input.resourceType,
        description: ctx.input.description,
        settings: ctx.input.settings
      });
      return {
        output: {
          functionId: fn?.id,
          displayName: fn?.displayName,
          resourceType: fn?.resourceType
        },
        message: `Created function **${fn?.displayName ?? ctx.input.displayName}**`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.functionId) throw new Error('functionId is required');
      let updateData: Record<string, any> = {};
      if (ctx.input.displayName !== undefined) updateData.displayName = ctx.input.displayName;
      if (ctx.input.code !== undefined) updateData.code = ctx.input.code;
      if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
      if (ctx.input.settings !== undefined) updateData.settings = ctx.input.settings;

      let fn = await client.updateFunction(ctx.input.functionId, updateData);
      return {
        output: {
          functionId: fn?.id,
          displayName: fn?.displayName,
          resourceType: fn?.resourceType
        },
        message: `Updated function **${fn?.displayName ?? ctx.input.functionId}**`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.functionId) throw new Error('functionId is required');
      await client.deleteFunction(ctx.input.functionId);
      return {
        output: { functionId: ctx.input.functionId, deleted: true },
        message: `Deleted function \`${ctx.input.functionId}\``
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
