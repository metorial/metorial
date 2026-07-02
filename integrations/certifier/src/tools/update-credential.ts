import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCredential = SlateTool.create(spec, {
  name: 'Update Credential',
  key: 'update_credential',
  description: `Update an existing credential's recipient name, dates, or custom attributes. Only provided fields are updated; omitted fields remain unchanged.`,
  instructions: [
    'Set expiryDate to null to clear the expiration date.',
    'Custom attribute keys must use the "custom." prefix.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      credentialId: z.string().describe('ID of the credential to update'),
      recipientName: z.string().optional().describe('Updated recipient name'),
      issueDate: z.string().optional().describe('Updated issuance date in YYYY-MM-DD format'),
      expiryDate: z
        .string()
        .nullable()
        .optional()
        .describe('Updated expiration date in YYYY-MM-DD format, or null to clear'),
      customAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom attribute key-value pairs to update')
    })
  )
  .output(
    z.object({
      credentialId: z.string().describe('ID of the updated credential'),
      publicId: z.string().describe('Public UUID of the credential'),
      groupId: z.string().describe('ID of the group'),
      status: z.string().describe('Current status'),
      recipientName: z.string().describe('Name of the recipient'),
      recipientEmail: z.string().optional().describe('Email of the recipient'),
      issueDate: z.string().describe('Issuance date'),
      expiryDate: z.string().nullable().describe('Expiration date'),
      customAttributes: z.record(z.string(), z.string()).describe('Custom attributes'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateParams: Record<string, any> = {};
    if (ctx.input.recipientName !== undefined) {
      updateParams.recipient = { name: ctx.input.recipientName };
    }
    if (ctx.input.issueDate !== undefined) {
      updateParams.issueDate = ctx.input.issueDate;
    }
    if (ctx.input.expiryDate !== undefined) {
      updateParams.expiryDate = ctx.input.expiryDate;
    }
    if (ctx.input.customAttributes !== undefined) {
      updateParams.customAttributes = ctx.input.customAttributes;
    }

    let credential = await client.updateCredential(ctx.input.credentialId, updateParams);

    return {
      output: {
        credentialId: credential.id,
        publicId: credential.publicId,
        groupId: credential.groupId,
        status: credential.status,
        recipientName: credential.recipient.name,
        recipientEmail: credential.recipient.email,
        issueDate: credential.issueDate,
        expiryDate: credential.expiryDate,
        customAttributes: credential.customAttributes,
        updatedAt: credential.updatedAt
      },
      message: `Credential \`${credential.id}\` updated for **${credential.recipient.name}**.`
    };
  })
  .build();
