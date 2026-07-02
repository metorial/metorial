import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let credentialEvent = SlateTrigger.create(spec, {
  name: 'Credential Event',
  key: 'credential_event',
  description:
    'Triggers when a credential is created, updated, deleted, or issued. Webhooks must be configured in the Certifier dashboard.'
})
  .input(
    z.object({
      eventType: z
        .enum([
          'credential.created',
          'credential.updated',
          'credential.deleted',
          'credential.issued'
        ])
        .describe('Type of credential event'),
      credentialId: z.string().describe('ID of the affected credential'),
      rawPayload: z.any().describe('Full raw webhook payload')
    })
  )
  .output(
    z.object({
      credentialId: z.string().describe('ID of the affected credential'),
      publicId: z.string().optional().describe('Public UUID of the credential'),
      groupId: z.string().optional().describe('ID of the group the credential belongs to'),
      status: z.string().optional().describe('Current status of the credential'),
      recipientName: z.string().optional().describe('Name of the recipient'),
      recipientEmail: z.string().optional().describe('Email of the recipient'),
      issueDate: z.string().optional().describe('Issuance date'),
      expiryDate: z.string().nullable().optional().describe('Expiration date'),
      customAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom attributes'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;

      let eventType = body.type || body.event;
      let credentialData = body.data || body.credential || body;
      let credentialId = credentialData?.id || body.id || '';

      return {
        inputs: [
          {
            eventType,
            credentialId,
            rawPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.rawPayload;
      let credentialData = payload?.data || payload?.credential || payload;

      let output: Record<string, any> = {
        credentialId: ctx.input.credentialId
      };

      if (credentialData) {
        if (credentialData.publicId) output.publicId = credentialData.publicId;
        if (credentialData.groupId) output.groupId = credentialData.groupId;
        if (credentialData.status) output.status = credentialData.status;
        if (credentialData.recipient?.name)
          output.recipientName = credentialData.recipient.name;
        if (credentialData.recipient?.email)
          output.recipientEmail = credentialData.recipient.email;
        if (credentialData.issueDate) output.issueDate = credentialData.issueDate;
        if (credentialData.expiryDate !== undefined)
          output.expiryDate = credentialData.expiryDate;
        if (credentialData.customAttributes)
          output.customAttributes = credentialData.customAttributes;
        if (credentialData.createdAt) output.createdAt = credentialData.createdAt;
        if (credentialData.updatedAt) output.updatedAt = credentialData.updatedAt;
      }

      // If we don't have enough data from the webhook payload, fetch the credential
      if (!output.status && ctx.input.eventType !== 'credential.deleted') {
        try {
          let client = new Client({ token: ctx.auth.token });
          let credential = await client.getCredential(ctx.input.credentialId);
          output = {
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
          };
        } catch {
          // Keep what we have from the payload
        }
      }

      return {
        type: ctx.input.eventType,
        id: `${ctx.input.eventType}_${ctx.input.credentialId}_${Date.now()}`,
        output: output as any
      };
    }
  })
  .build();
