import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new email campaign in your Mailercloud account. Campaigns require content (HTML or plain text) and a target audience (list ID or segment ID). You can specify the sender details, subject, and reply-to address.`,
  instructions: [
    'Either htmlContent or textContent must be provided.',
    'Either listId or segmentId must be provided to target recipients.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the campaign'),
      subject: z.string().describe('Email subject line'),
      fromName: z.string().describe('Sender name displayed in the email'),
      fromEmail: z.string().describe('Sender email address'),
      replyTo: z.string().optional().describe('Reply-to email address'),
      htmlContent: z.string().optional().describe('HTML content of the email'),
      textContent: z.string().optional().describe('Plain text content of the email'),
      listId: z.string().optional().describe('ID of the list to send the campaign to'),
      segmentId: z.string().optional().describe('ID of the segment to send the campaign to'),
      tags: z
        .array(z.string())
        .optional()
        .describe('Legacy field. Omit it: campaign tags are not supported by this endpoint.')
    })
  )
  .output(
    z
      .object({
        campaignId: z.string().optional().describe('ID of the created campaign'),
        name: z.string().optional().describe('Name of the created campaign')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.htmlContent?.trim() && !ctx.input.textContent?.trim()) {
      throw createApiServiceError('Provide htmlContent or textContent for the campaign.');
    }
    if (!ctx.input.listId?.trim() && !ctx.input.segmentId?.trim()) {
      throw createApiServiceError('Provide listId or segmentId for the campaign audience.');
    }
    if (ctx.input.tags?.length) {
      throw createApiServiceError(
        'Campaign tags are not supported by this endpoint. Omit tags.'
      );
    }

    let client = new Client({ token: ctx.auth.token });

    let result = await client.createCampaign({
      name: ctx.input.name,
      subject: ctx.input.subject,
      fromName: ctx.input.fromName,
      fromEmail: ctx.input.fromEmail,
      replyTo: ctx.input.replyTo,
      htmlContent: ctx.input.htmlContent,
      textContent: ctx.input.textContent,
      listId: ctx.input.listId,
      segmentId: ctx.input.segmentId
    });

    let data = result?.data ?? result;

    return {
      output: {
        campaignId: data?.id ?? data?.enc_id ?? undefined,
        name: ctx.input.name,
        ...data
      },
      message: `Successfully created campaign **${ctx.input.name}**.`
    };
  })
  .build();
