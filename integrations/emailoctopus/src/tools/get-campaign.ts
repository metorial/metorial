import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve details of a specific campaign including status, subject, sender info, target lists, and HTML content.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to retrieve')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Unique identifier of the campaign'),
      status: z.string().describe('Campaign status: DRAFT, SENDING, SENT, or ERROR'),
      name: z.string().describe('Internal campaign name'),
      subject: z.string().describe('Email subject line'),
      to: z.array(z.string()).describe('List IDs the campaign targets'),
      from: z.object({
        name: z.string().describe('Sender name'),
        emailAddress: z.string().describe('Sender email address')
      }),
      content: z.object({
        html: z.string().describe('HTML content of the email'),
        plainText: z.string().describe('Plain text content of the email')
      }),
      createdAt: z.string().describe('ISO 8601 creation timestamp'),
      sentAt: z.string().nullable().describe('ISO 8601 sent timestamp, null if not sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let campaign = await client.getCampaign(ctx.input.campaignId);

    return {
      output: campaign,
      message: `Retrieved campaign **${campaign.name}** (status: ${campaign.status}).`
    };
  })
  .build();
