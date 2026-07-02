import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateCredential = SlateTool.create(spec, {
  name: 'Update Credential',
  key: 'update_credential',
  description: `Update an existing credential's details. Can modify credential metadata, recipient information, publication status, custom attributes, and more. Only the fields you provide will be updated.`,
  instructions: [
    'Provide only the fields you want to change; omitted fields will remain unchanged.',
    'Dates should be in YYYY-MM-DD format.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      credentialId: z.string().describe('ID of the credential to update'),
      credentialName: z.string().optional().describe('New name for the credential'),
      description: z.string().optional().describe('New description for the credential'),
      issuedOn: z.string().optional().describe('New issue date in YYYY-MM-DD format'),
      expiredOn: z.string().optional().describe('New expiry date in YYYY-MM-DD format'),
      isComplete: z.boolean().optional().describe('Whether the credential is complete'),
      isPrivate: z.boolean().optional().describe('Whether the credential is private'),
      autoApprove: z.boolean().optional().describe('Whether to publish the credential'),
      customAttributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated custom attributes'),
      groupId: z.number().optional().describe('Move credential to a different group'),
      recipientName: z.string().optional().describe('Updated recipient name'),
      recipientEmail: z.string().optional().describe('Updated recipient email')
    })
  )
  .output(
    z.object({
      credentialId: z.string().describe('ID of the updated credential'),
      credentialName: z.string().optional().describe('Updated credential name'),
      recipientName: z.string().optional().describe('Recipient name'),
      recipientEmail: z.string().optional().describe('Recipient email'),
      groupName: z.string().optional().describe('Group name'),
      approved: z.boolean().optional().describe('Whether the credential is published')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let recipientUpdate =
      ctx.input.recipientName !== undefined || ctx.input.recipientEmail !== undefined
        ? {
            ...(ctx.input.recipientName !== undefined && { name: ctx.input.recipientName }),
            ...(ctx.input.recipientEmail !== undefined && { email: ctx.input.recipientEmail })
          }
        : undefined;

    let credential = await client.updateCredential(ctx.input.credentialId, {
      name: ctx.input.credentialName,
      description: ctx.input.description,
      issuedOn: ctx.input.issuedOn,
      expiredOn: ctx.input.expiredOn,
      complete: ctx.input.isComplete,
      private: ctx.input.isPrivate,
      approve: ctx.input.autoApprove,
      customAttributes: ctx.input.customAttributes,
      groupId: ctx.input.groupId,
      recipient: recipientUpdate
    });

    return {
      output: {
        credentialId: String(credential.id),
        credentialName: credential.name,
        recipientName: credential.recipient?.name,
        recipientEmail: credential.recipient?.email,
        groupName: credential.group_name,
        approved: credential.approve
      },
      message: `Credential **${credential.id}** updated successfully.`
    };
  })
  .build();
