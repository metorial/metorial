import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
import {
  email,
  identifier,
  optionalBoolean,
  optionalNumber,
  optionalText,
  text
} from '../lib/data';
import { spec } from '../spec';

let mailingListSchema = z.object({
  mailingListId: z.string().describe('ID of the mailing list to send to'),
  segmentId: z
    .string()
    .optional()
    .describe('Optional segment ID to filter recipients within the list')
});

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new email campaign as a draft. Supports regular and A/B test campaigns. The campaign can be sent or scheduled after creation using the appropriate tools.`,
  instructions: [
    'Provide at least one mailing list for campaign recipients.',
    'For A/B test campaigns, set isAB to true and configure the abCampaignType along with corresponding B-variant fields.',
    'The senderEmail must be a verified sender signature in your Moosend account.'
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
      senderEmail: z.string().describe('Verified sender email address'),
      replyToEmail: z.string().describe('Reply-to email address'),
      mailingLists: z
        .array(mailingListSchema)
        .min(1)
        .describe('Mailing lists to send the campaign to'),
      webLocation: z.string().optional().describe('URL to hosted HTML email content'),
      htmlContent: z
        .string()
        .optional()
        .describe('Complete inline HTML content; use instead of webLocation'),
      confirmationToEmail: z
        .string()
        .optional()
        .describe('Email to receive campaign send confirmation'),
      isAB: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether this is an A/B test campaign'),
      abCampaignType: z
        .enum(['Subject', 'Content', 'Sender'])
        .optional()
        .describe('Type of A/B test variation'),
      subjectB: z.string().optional().describe('Subject line for A/B variant B'),
      webLocationB: z.string().optional().describe('Content URL for A/B variant B'),
      senderEmailB: z.string().optional().describe('Sender email for A/B variant B'),
      hoursToTest: z.number().optional().describe('Hours to run the A/B test (1-24)'),
      listPercentage: z.number().optional().describe('Percentage of list to use for A/B test'),
      abWinnerSelectionType: z
        .enum(['OpenRate', 'TotalUniqueClicks'])
        .optional()
        .describe('How to determine the A/B test winner'),
      trackInGoogleAnalytics: z
        .boolean()
        .optional()
        .describe('Enable Google Analytics tracking'),
      dontTrackLinkClicks: z.boolean().optional().describe('Disable link click tracking')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the created campaign'),
      name: z.string().describe('Name of the campaign'),
      subject: z.string().describe('Subject line of the campaign'),
      status: z.number().optional().describe('Campaign status code'),
      isTransactional: z
        .boolean()
        .optional()
        .describe('Whether the campaign is transactional'),
      createdOn: z.string().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MoosendClient({ token: ctx.auth.token });

    if (!ctx.input.htmlContent && !ctx.input.webLocation)
      throw createApiServiceError(
        'Provide htmlContent or webLocation for the campaign content.'
      );
    if (ctx.input.htmlContent && ctx.input.webLocation)
      throw createApiServiceError('Provide only one of htmlContent and webLocation.');
    if (ctx.input.isAB) {
      if (!ctx.input.abCampaignType)
        throw createApiServiceError('Provide abCampaignType for an A/B campaign.');
      if (ctx.input.abCampaignType === 'Subject' && !ctx.input.subjectB)
        throw createApiServiceError('Provide subjectB for a subject A/B test.');
      if (ctx.input.abCampaignType === 'Content' && !ctx.input.webLocationB)
        throw createApiServiceError('Provide webLocationB for a content A/B test.');
      if (ctx.input.abCampaignType === 'Sender' && !ctx.input.senderEmailB)
        throw createApiServiceError('Provide senderEmailB for a sender A/B test.');
    }
    if (
      ctx.input.hoursToTest !== undefined &&
      (!Number.isInteger(ctx.input.hoursToTest) ||
        ctx.input.hoursToTest < 1 ||
        ctx.input.hoursToTest > 24)
    )
      throw createApiServiceError('hoursToTest must be an integer from 1 to 24.');
    if (
      ctx.input.listPercentage !== undefined &&
      (!Number.isInteger(ctx.input.listPercentage) ||
        ctx.input.listPercentage < 5 ||
        ctx.input.listPercentage > 40)
    )
      throw createApiServiceError('listPercentage must be an integer from 5 to 40.');
    let body: Record<string, unknown> = {
      Name: text(ctx.input.name, 'campaign name'),
      Subject: text(ctx.input.subject, 'subject'),
      SenderEmail: email(ctx.input.senderEmail, 'sender email'),
      ReplyToEmail: email(ctx.input.replyToEmail, 'reply-to email'),
      IsAB: ctx.input.isAB ?? false,
      MailingLists: ctx.input.mailingLists.map(ml => ({
        MailingListID: text(ml.mailingListId, 'mailing list ID'),
        ...(ml.segmentId ? { SegmentID: ml.segmentId } : {})
      }))
    };

    if (ctx.input.htmlContent !== undefined)
      body.HTMLContent = text(ctx.input.htmlContent, 'HTML content');
    if (ctx.input.webLocation) body.WebLocation = ctx.input.webLocation;
    if (ctx.input.confirmationToEmail)
      body.ConfirmationToEmail = email(ctx.input.confirmationToEmail, 'confirmation email');
    if (ctx.input.abCampaignType)
      body.ABCampaignType =
        ctx.input.abCampaignType === 'Subject' ? 'Subjectline' : ctx.input.abCampaignType;
    if (ctx.input.subjectB) body.SubjectB = ctx.input.subjectB;
    if (ctx.input.webLocationB) body.WebLocationB = ctx.input.webLocationB;
    if (ctx.input.senderEmailB)
      body.SenderEmailB = email(ctx.input.senderEmailB, 'second sender email');
    if (ctx.input.hoursToTest !== undefined) body.HoursToTest = String(ctx.input.hoursToTest);
    if (ctx.input.listPercentage !== undefined)
      body.ListPercentage = String(ctx.input.listPercentage);
    if (ctx.input.abWinnerSelectionType)
      body.ABWinnerSelectionType = ctx.input.abWinnerSelectionType;
    if (ctx.input.trackInGoogleAnalytics !== undefined)
      body.TrackInGoogleAnalytics = String(ctx.input.trackInGoogleAnalytics);
    if (ctx.input.dontTrackLinkClicks !== undefined)
      body.DontTrackLinkClicks = String(ctx.input.dontTrackLinkClicks);

    let result = await client.createCampaign(body);

    return {
      output: {
        campaignId: identifier(result.ID),
        name: text(result.Name, 'campaign name'),
        subject: text(result.Subject, 'campaign subject'),
        status: optionalNumber(result.Status),
        isTransactional: optionalBoolean(result.IsTransactional),
        createdOn: optionalText(result.CreatedOn)
      },
      message: `Created draft campaign **${ctx.input.name}** with subject "${ctx.input.subject}".`
    };
  })
  .build();
