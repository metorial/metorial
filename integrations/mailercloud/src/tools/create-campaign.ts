import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new email campaign in your Mailercloud account. Campaigns require content (HTML or plain text) and a target audience (list ID or segment ID). You can specify the sender details, subject, reply-to address, and tags.`,
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
      tags: z.array(z.string()).optional().describe('Tags for the campaign')
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
      segmentId: ctx.input.segmentId,
      tags: ctx.input.tags as string[] | undefined
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
