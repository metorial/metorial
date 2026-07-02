import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let cannedResponseSchema = z.object({
  id: z.string().describe('Unique canned response identifier'),
  name: z.string().describe('Canned response name'),
  content: z.string().describe('The response content/body text'),
  shortcut: z
    .string()
    .optional()
    .describe('Keyboard shortcut to quickly insert this canned response'),
  teamIDs: z
    .array(z.string())
    .optional()
    .describe('IDs of teams this canned response is available to'),
  createdAt: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp when the canned response was created'),
  updatedAt: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp when the canned response was last updated')
});

export let manageCannedResponses = SlateTool.create(spec, {
  name: 'Manage Canned Responses',
  key: 'manage_canned_responses',
  description: `List, get, create, update, and delete HelpDesk canned responses. Canned responses are pre-written reply templates that agents can quickly insert into ticket replies to save time and ensure consistent messaging. They can have keyboard shortcuts and be scoped to specific teams.`,
  instructions: [
    'Use "list" to retrieve all canned responses in the account.',
    'Use "get" with a cannedResponseId to retrieve a specific canned response.',
    'Use "create" with name and content to create a new canned response.',
    'Use "update" with a cannedResponseId plus fields to modify an existing canned response.',
    'Use "delete" with a cannedResponseId to remove a canned response.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Operation to perform on canned responses'),
      cannedResponseId: z
        .string()
        .optional()
        .describe('Canned response ID (required for get, update, delete)'),
      name: z
        .string()
        .optional()
        .describe('Canned response name (required for create, optional for update)'),
      content: z
        .string()
        .optional()
        .describe('Response content/body text (required for create, optional for update)'),
      shortcut: z
        .string()
        .optional()
        .describe('Keyboard shortcut for quick insertion (optional for create and update)'),
      teamIDs: z
        .array(z.string())
        .optional()
        .describe('Team IDs to scope this canned response to (optional for create and update)')
    })
  )
  .output(
    z.object({
      cannedResponses: z
        .array(cannedResponseSchema)
        .optional()
        .describe('List of canned responses (for list action)'),
      cannedResponse: cannedResponseSchema
        .optional()
        .describe('Single canned response details (for get, create, update actions)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether the canned response was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let cannedResponses = await client.listCannedResponses();
      return {
        output: { cannedResponses },
        message: `Found **${cannedResponses.length}** canned response(s).`
      };
    }

    if (action === 'get') {
      if (!ctx.input.cannedResponseId) {
        throw new Error('cannedResponseId is required for the "get" action');
      }
      let cannedResponse = await client.getCannedResponse(ctx.input.cannedResponseId);
      return {
        output: { cannedResponse },
        message: `Retrieved canned response **${cannedResponse.name}** (${cannedResponse.id}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) {
        throw new Error('name is required for the "create" action');
      }
      if (!ctx.input.content) {
        throw new Error('content is required for the "create" action');
      }
      let input: Record<string, unknown> = {
        name: ctx.input.name,
        content: ctx.input.content
      };
      if (ctx.input.shortcut !== undefined) input.shortcut = ctx.input.shortcut;
      if (ctx.input.teamIDs !== undefined) input.teamIDs = ctx.input.teamIDs;

      let cannedResponse = await client.createCannedResponse(input as any);
      return {
        output: { cannedResponse },
        message: `Created canned response **${cannedResponse.name}** (${cannedResponse.id}).`
      };
    }

    if (action === 'update') {
      if (!ctx.input.cannedResponseId) {
        throw new Error('cannedResponseId is required for the "update" action');
      }
      let input: Record<string, unknown> = {};
      if (ctx.input.name !== undefined) input.name = ctx.input.name;
      if (ctx.input.content !== undefined) input.content = ctx.input.content;
      if (ctx.input.shortcut !== undefined) input.shortcut = ctx.input.shortcut;
      if (ctx.input.teamIDs !== undefined) input.teamIDs = ctx.input.teamIDs;

      let cannedResponse = await client.updateCannedResponse(
        ctx.input.cannedResponseId,
        input as any
      );
      return {
        output: { cannedResponse },
        message: `Updated canned response **${cannedResponse.name}** (${cannedResponse.id}).`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.cannedResponseId) {
        throw new Error('cannedResponseId is required for the "delete" action');
      }
      await client.deleteCannedResponse(ctx.input.cannedResponseId);
      return {
        output: { deleted: true },
        message: `Deleted canned response **${ctx.input.cannedResponseId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
