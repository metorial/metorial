import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { recipientMap } from '../lib/schemas';
import { clientConfig, invalid } from '../lib/validation';
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
  tags: { destructive: true },
  instructions: [
    'Provide exactly one of: recipientsToCreate, recipientsToUpdate, or recipientIdToDelete.',
    'Roles: SIGNER, VIEWER, APPROVER, CC. Creation defaults omitted name to empty and role to SIGNER. Changes require a DRAFT envelope.'
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
    const input = ctx.input;
    const count =
      Number(input.recipientsToCreate !== undefined) +
      Number(input.recipientsToUpdate !== undefined) +
      Number(input.recipientIdToDelete !== undefined);
    if (count !== 1) throw invalid('Provide exactly one create, update, or delete action.');
    const client = new Client(clientConfig(ctx));
    if (input.recipientsToCreate !== undefined) {
      const r = await client.createRecipients(input.envelopeId, input.recipientsToCreate);
      return {
        output: { recipients: r.data.map(recipientMap) },
        message: `Created ${r.data.length} recipients.`
      };
    }
    if (input.recipientsToUpdate !== undefined) {
      const r = await client.updateRecipients(input.envelopeId, input.recipientsToUpdate);
      return {
        output: { recipients: r.data.map(recipientMap) },
        message: `Updated ${r.data.length} recipients.`
      };
    }
    if (input.recipientIdToDelete === undefined)
      throw invalid('Provide the exact recipient ID.');
    await client.deleteRecipient(input.envelopeId, input.recipientIdToDelete);
    return {
      output: { deleted: true },
      message: 'Documenso acknowledged recipient deletion.'
    };
  })
  .build();
