import { SlateTool } from 'slates';
import { z } from 'zod';
import { MoosendClient } from '../lib/client';
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
  description: `Create a new email campaign as a draft. Supports regular campaigns, A/B test campaigns, and RSS campaigns. The campaign can be sent or scheduled after creation using the appropriate tools.`,
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

    let body: Record<string, unknown> = {
      Name: ctx.input.name,
      Subject: ctx.input.subject,
      SenderEmail: ctx.input.senderEmail,
      ReplyToEmail: ctx.input.replyToEmail,
      IsAB: String(ctx.input.isAB ?? false),
      MailingLists: ctx.input.mailingLists.map(ml => ({
        MailingListID: ml.mailingListId,
        ...(ml.segmentId ? { SegmentID: ml.segmentId } : {})
      }))
    };

    if (ctx.input.webLocation) body.WebLocation = ctx.input.webLocation;
    if (ctx.input.confirmationToEmail)
      body.ConfirmationToEmail = ctx.input.confirmationToEmail;
    if (ctx.input.abCampaignType) body.ABCampaignType = ctx.input.abCampaignType;
    if (ctx.input.subjectB) body.SubjectB = ctx.input.subjectB;
    if (ctx.input.webLocationB) body.WebLocationB = ctx.input.webLocationB;
    if (ctx.input.senderEmailB) body.SenderEmailB = ctx.input.senderEmailB;
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
        campaignId: String(result?.ID ?? ''),
        name: String(result?.Name ?? ''),
        subject: String(result?.Subject ?? ''),
        status: result?.Status as number | undefined,
        isTransactional: result?.IsTransactional as boolean | undefined,
        createdOn: result?.CreatedOn ? String(result.CreatedOn) : undefined
      },
      message: `Created draft campaign **${ctx.input.name}** with subject "${ctx.input.subject}".`
    };
  })
  .build();
