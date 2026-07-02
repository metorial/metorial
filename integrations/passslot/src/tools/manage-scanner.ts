import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageScanner = SlateTool.create(spec, {
  name: 'Manage Scanner',
  key: 'manage_scanner',
  description: `Create, update, or delete a scanner configuration for pass verification and redemption. Scanners work with the PassSlot Pass Verifier app to scan, validate, and redeem passes.`,
  instructions: [
    'Set action to "create" to create a new scanner, "update" to modify an existing one, or "delete" to remove one.',
    'Scanner type can be "PassVerifier" (for the mobile app) or "Browser" (for browser-based scanning).',
    'If fullAccess is false, you must provide allowedTemplates to restrict which templates the scanner can access.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      scannerId: z.number().optional().describe('Scanner ID (required for update and delete)'),
      name: z.string().optional().describe('Scanner display name (required for create)'),
      type: z
        .enum(['PassVerifier', 'Browser'])
        .optional()
        .describe('Scanner type (required for create)'),
      fullAccess: z
        .boolean()
        .optional()
        .describe('Whether the scanner has full access to all templates'),
      allowedTemplates: z
        .array(z.number())
        .optional()
        .describe('Template IDs the scanner can access (required if fullAccess is false)')
    })
  )
  .output(
    z.object({
      scannerId: z.number().optional().describe('Scanner identifier'),
      name: z.string().optional().describe('Scanner display name'),
      type: z.string().optional().describe('Scanner type'),
      fullAccess: z.boolean().optional().describe('Whether the scanner has full access'),
      authenticationToken: z
        .string()
        .optional()
        .describe('Authentication token for PassVerifier scanners'),
      passverifierAuthorizationUrl: z
        .string()
        .optional()
        .describe('Authorization URL for PassVerifier setup'),
      pin: z.string().optional().describe('PIN code for Browser scanners'),
      deleted: z.boolean().optional().describe('Whether the scanner was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.action === 'create') {
      if (!ctx.input.name || !ctx.input.type) {
        throw new Error('name and type are required for creating a scanner.');
      }
      let result = await client.createScanner({
        name: ctx.input.name,
        type: ctx.input.type,
        fullAccess: ctx.input.fullAccess ?? true,
        allowedTemplates: ctx.input.allowedTemplates
      });

      return {
        output: {
          scannerId: result.id,
          name: result.name,
          type: result.type,
          fullAccess: result.fullAccess,
          authenticationToken: result.authenticationToken,
          passverifierAuthorizationUrl: result.passverifierAuthorizationURL,
          pin: result.pin
        },
        message: `Created scanner **${result.name}** (ID: ${result.id}).`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.scannerId) {
        throw new Error('scannerId is required for updating a scanner.');
      }
      let updateData: Record<string, any> = {};
      if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
      if (ctx.input.type !== undefined) updateData.type = ctx.input.type;
      if (ctx.input.fullAccess !== undefined) updateData.fullAccess = ctx.input.fullAccess;
      if (ctx.input.allowedTemplates !== undefined)
        updateData.allowedTemplates = ctx.input.allowedTemplates;

      let result = await client.updateScanner(ctx.input.scannerId, updateData);

      return {
        output: {
          scannerId: result.id,
          name: result.name,
          type: result.type,
          fullAccess: result.fullAccess,
          authenticationToken: result.authenticationToken,
          passverifierAuthorizationUrl: result.passverifierAuthorizationURL,
          pin: result.pin
        },
        message: `Updated scanner **${result.name}** (ID: ${result.id}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.scannerId) {
        throw new Error('scannerId is required for deleting a scanner.');
      }
      await client.deleteScanner(ctx.input.scannerId);

      return {
        output: {
          scannerId: ctx.input.scannerId,
          deleted: true
        },
        message: `Deleted scanner **${ctx.input.scannerId}**.`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
