import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCredential = SlateTool.create(spec, {
  name: 'Get Credential',
  key: 'get_credential',
  description: `Retrieve a specific credential by its ID. Returns full credential details including recipient information, status, dates, and custom attributes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      credentialId: z.string().describe('Unique ID of the credential to retrieve')
    })
  )
  .output(
    z.object({
      credentialId: z.string().describe('Unique ID of the credential'),
      publicId: z.string().describe('Public UUID of the credential'),
      groupId: z.string().describe('ID of the group'),
      status: z.string().describe('Current status (draft, scheduled, issued, expired)'),
      recipientName: z.string().describe('Name of the recipient'),
      recipientEmail: z.string().optional().describe('Email of the recipient'),
      issueDate: z.string().describe('Issuance date'),
      expiryDate: z.string().nullable().describe('Expiration date'),
      customAttributes: z
        .record(z.string(), z.string())
        .describe('Custom attribute key-value pairs'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let credential = await client.getCredential(ctx.input.credentialId);

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
        createdAt: credential.createdAt,
        updatedAt: credential.updatedAt
      },
      message: `Credential for **${credential.recipient.name}** — status: **${credential.status}**, group: \`${credential.groupId}\`.`
    };
  })
  .build();
