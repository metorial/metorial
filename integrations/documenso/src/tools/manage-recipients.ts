import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientOutputSchema = z.object({
  recipientId: z.number().describe('Unique identifier of the recipient'),
  email: z.string().describe('Recipient email address'),
  name: z.string().describe('Recipient display name'),
  role: z.string().describe('Recipient role'),
  signingOrder: z.number().optional().describe('Signing order')
});

export let manageRecipientsTool = SlateTool.create(spec, {
  name: 'Manage Recipients',
  key: 'manage_recipients',
  description: `Add, update, or remove recipients on an envelope. You can create multiple recipients at once, update their details (email, name, role, signing order), or delete a recipient. Only one action (create, update, or delete) can be performed per call.`,
  instructions: [
    'Provide exactly one of: recipientsToCreate, recipientsToUpdate, or recipientIdToDelete.',
    'Roles: SIGNER, VIEWER, APPROVER, CC.'
  ]
})
  .input(
    z.object({
      envelopeId: z.string().describe('ID of the envelope to manage recipients for'),
      recipientsToCreate: z
        .array(
          z.object({
            email: z.string().describe('Recipient email address'),
            name: z.string().optional().describe('Recipient display name'),
            role: z
              .enum(['SIGNER', 'VIEWER', 'APPROVER', 'CC'])
              .optional()
              .describe('Recipient role'),
            signingOrder: z
              .number()
              .optional()
              .describe('Signing order for sequential signing')
          })
        )
        .optional()
        .describe('Recipients to add to the envelope'),
      recipientsToUpdate: z
        .array(
          z.object({
            recipientId: z.number().describe('ID of the recipient to update'),
            email: z.string().optional().describe('Updated email address'),
            name: z.string().optional().describe('Updated display name'),
            role: z
              .enum(['SIGNER', 'VIEWER', 'APPROVER', 'CC'])
              .optional()
              .describe('Updated role'),
            signingOrder: z.number().optional().describe('Updated signing order')
          })
        )
        .optional()
        .describe('Recipients to update'),
      recipientIdToDelete: z.number().optional().describe('ID of the recipient to remove')
    })
  )
  .output(
    z.object({
      recipients: z
        .array(recipientOutputSchema)
        .optional()
        .describe('Created or updated recipients'),
      deleted: z.boolean().optional().describe('Whether the recipient was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    if (ctx.input.recipientsToCreate && ctx.input.recipientsToCreate.length > 0) {
      let result = await client.createRecipients(
        ctx.input.envelopeId,
        ctx.input.recipientsToCreate
      );
      let items = Array.isArray(result) ? result : (result.data ?? []);

      return {
        output: {
          recipients: items.map((r: Record<string, unknown>) => ({
            recipientId: Number(r.id ?? r.recipientId ?? 0),
            email: String(r.email ?? ''),
            name: String(r.name ?? ''),
            role: String(r.role ?? ''),
            signingOrder: r.signingOrder != null ? Number(r.signingOrder) : undefined
          }))
        },
        message: `Added ${items.length} recipient(s) to envelope \`${ctx.input.envelopeId}\`.`
      };
    }

    if (ctx.input.recipientsToUpdate && ctx.input.recipientsToUpdate.length > 0) {
      let result = await client.updateRecipients(
        ctx.input.envelopeId,
        ctx.input.recipientsToUpdate
      );
      let items = Array.isArray(result) ? result : (result.data ?? []);

      return {
        output: {
          recipients: items.map((r: Record<string, unknown>) => ({
            recipientId: Number(r.id ?? r.recipientId ?? 0),
            email: String(r.email ?? ''),
            name: String(r.name ?? ''),
            role: String(r.role ?? ''),
            signingOrder: r.signingOrder != null ? Number(r.signingOrder) : undefined
          }))
        },
        message: `Updated ${items.length} recipient(s) on envelope \`${ctx.input.envelopeId}\`.`
      };
    }

    if (ctx.input.recipientIdToDelete != null) {
      await client.deleteRecipient(ctx.input.recipientIdToDelete);
      return {
        output: { deleted: true },
        message: `Deleted recipient \`${ctx.input.recipientIdToDelete}\` from envelope \`${ctx.input.envelopeId}\`.`
      };
    }

    return {
      output: {},
      message: 'No recipient action specified.'
    };
  })
  .build();
