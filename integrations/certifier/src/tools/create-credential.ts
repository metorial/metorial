import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCredential = SlateTool.create(spec, {
  name: 'Create Credential',
  key: 'create_credential',
  description: `Create a new digital credential (certificate or badge) for a recipient. Supports three modes:
- **Draft only**: Creates a draft credential that can be issued and sent later.
- **Issue and send**: Creates, issues, and sends the credential to the recipient via email in one step — ideal for automation upon course completion or event attendance.

Custom attributes must be pre-configured in the Certifier dashboard before use.`,
  instructions: [
    'Set issueAndSend to true to create, issue, and send the credential in one step.',
    'Custom attribute keys must use the "custom." prefix, e.g. "custom.mentor".',
    'Dates must be in YYYY-MM-DD format.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      groupId: z.string().describe('ID of the group to create the credential in'),
      recipientName: z.string().describe('Full name of the credential recipient'),
      recipientEmail: z.string().optional().describe('Email address of the recipient'),
      issueDate: z
        .string()
        .optional()
        .describe('Issuance date in YYYY-MM-DD format (defaults to today)'),
      expiryDate: z.string().optional().describe('Expiration date in YYYY-MM-DD format'),
      customAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom attribute key-value pairs (keys must use "custom." prefix)'),
      issueAndSend: z
        .boolean()
        .optional()
        .describe('If true, creates, issues, and sends the credential in one step')
    })
  )
  .output(
    z.object({
      credentialId: z.string().describe('Unique ID of the created credential'),
      publicId: z.string().describe('Public UUID of the credential'),
      groupId: z.string().describe('ID of the group the credential belongs to'),
      status: z.string().describe('Current status of the credential'),
      recipientName: z.string().describe('Name of the recipient'),
      recipientEmail: z.string().optional().describe('Email of the recipient'),
      issueDate: z.string().describe('Issuance date'),
      expiryDate: z.string().nullable().describe('Expiration date'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let params = {
      groupId: ctx.input.groupId,
      recipient: {
        name: ctx.input.recipientName,
        email: ctx.input.recipientEmail
      },
      issueDate: ctx.input.issueDate,
      expiryDate: ctx.input.expiryDate,
      customAttributes: ctx.input.customAttributes
    };

    let credential = ctx.input.issueAndSend
      ? await client.createIssueSendCredential(params)
      : await client.createCredential(params);

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
        createdAt: credential.createdAt
      },
      message: ctx.input.issueAndSend
        ? `Credential created, issued, and sent to **${credential.recipient.name}**${credential.recipient.email ? ` (${credential.recipient.email})` : ''} with status **${credential.status}**.`
        : `Draft credential created for **${credential.recipient.name}** with ID \`${credential.id}\`.`
    };
  })
  .build();
