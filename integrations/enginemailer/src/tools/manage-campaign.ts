import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCampaign = SlateTool.create(spec, {
  name: 'Manage Campaign',
  key: 'manage_campaign',
  description: `Create or update an email campaign. When creating, provide campaign name, sender details, subject, and HTML content. When updating, specify the campaign ID along with the fields to modify. Campaign API is restricted to paid plan users only.`,
  constraints: [
    'Campaign API is only available to paid plan users.',
    'Campaign content created via the API is not editable in the Enginemailer portal, but other parameters like name, sender name, and subject are.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe(
          'Campaign ID for updating an existing campaign. Omit to create a new campaign.'
        ),
      campaignName: z.string().optional().describe('Name of the campaign'),
      senderName: z.string().optional().describe('Sender display name'),
      senderEmail: z
        .string()
        .optional()
        .describe('Sender email address (must use a verified domain)'),
      subject: z.string().optional().describe('Email subject line'),
      htmlContent: z.string().optional().describe('HTML content of the campaign email')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status'),
      statusCode: z.string().describe('Response status code'),
      message: z.string().optional().describe('Response message'),
      campaignData: z.any().optional().describe('Campaign data returned by the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: any;
    let action: string;

    if (ctx.input.campaignId) {
      result = await client.updateCampaign({
        campaignId: ctx.input.campaignId,
        campaignName: ctx.input.campaignName,
        senderName: ctx.input.senderName,
        senderEmail: ctx.input.senderEmail,
        subject: ctx.input.subject,
        content: ctx.input.htmlContent
      });
      action = 'updated';
    } else {
      if (
        !ctx.input.campaignName ||
        !ctx.input.senderName ||
        !ctx.input.senderEmail ||
        !ctx.input.subject ||
        !ctx.input.htmlContent
      ) {
        throw new Error(
          'When creating a new campaign, campaignName, senderName, senderEmail, subject, and htmlContent are all required.'
        );
      }
      result = await client.createCampaign({
        campaignName: ctx.input.campaignName,
        senderName: ctx.input.senderName,
        senderEmail: ctx.input.senderEmail,
        subject: ctx.input.subject,
        content: ctx.input.htmlContent
      });
      action = 'created';
    }

    return {
      output: {
        status: result.Result?.Status ?? 'Unknown',
        statusCode: result.Result?.StatusCode ?? 'Unknown',
        message: result.Result?.Message ?? result.Result?.ErrorMessage,
        campaignData: result.Result?.Data
      },
      message: `Campaign ${action} successfully: **${ctx.input.campaignName ?? ctx.input.campaignId}**.`
    };
  })
  .build();
