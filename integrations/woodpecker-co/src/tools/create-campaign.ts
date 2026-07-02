import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let emailVersionSchema = z.object({
  subject: z.string().describe('Email subject line'),
  message: z.string().describe('Email body content (HTML supported)'),
  signature: z
    .enum(['SENDER', 'NONE'])
    .optional()
    .default('SENDER')
    .describe('Signature mode'),
  trackOpens: z.boolean().optional().default(true).describe('Whether to track email opens')
});

let deliveryTimeIntervalSchema = z.object({
  from: z.string().describe('Start time in HH:mm format (e.g., "08:00")'),
  to: z.string().describe('End time in HH:mm format (e.g., "17:00")')
});

let stepSchema = z.object({
  type: z
    .enum(['EMAIL', 'LINKEDIN_VIEW_PROFILE', 'LINKEDIN_CONNECT', 'LINKEDIN_MESSAGE'])
    .optional()
    .default('EMAIL')
    .describe('Step type'),
  versions: z
    .array(emailVersionSchema)
    .optional()
    .describe('Email content versions for A/B testing (up to 5). Required for EMAIL steps.'),
  delayDays: z
    .number()
    .optional()
    .describe('Number of days to wait before sending this step (after previous step)'),
  deliveryTime: z
    .record(z.string(), z.array(deliveryTimeIntervalSchema))
    .optional()
    .describe(
      'Delivery time windows per day of week (e.g., {"monday": [{"from":"08:00","to":"17:00"}]})'
    ),
  linkedinMessage: z
    .string()
    .optional()
    .describe('Message text for LinkedIn message/connect steps')
});

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new outreach campaign with email and/or LinkedIn steps. Configure multi-step sequences with A/B testing, delivery time windows, and campaign-level settings. The campaign will be created in DRAFT status.`,
  instructions: [
    'At least one step with one email version (subject + message) is required.',
    'Delivery time days not included in the deliveryTime object will have no emails sent on that day.',
    'A/B test versions are supported — up to 5 versions per step.'
  ],
  constraints: [
    'Campaigns with IF conditions, scheduled starts, or manual task steps are not supported via API.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Campaign name'),
      emailAccountIds: z
        .array(z.number())
        .optional()
        .describe('IDs of email accounts (mailboxes) to send from'),
      timezone: z.string().optional().describe('Campaign timezone (e.g., "America/New_York")'),
      prospectTimezone: z
        .boolean()
        .optional()
        .describe("Whether to use the prospect's timezone for sending"),
      dailyEnroll: z
        .number()
        .optional()
        .describe('Maximum number of new prospects to contact per day'),
      gdprUnsubscribe: z
        .boolean()
        .optional()
        .describe('Include GDPR-compliant unsubscribe link'),
      listUnsubscribe: z.boolean().optional().describe('Include List-Unsubscribe header'),
      trackOpens: z.boolean().optional().describe('Enable open tracking at campaign level'),
      steps: z.array(stepSchema).min(1).describe('Campaign steps in sequence order')
    })
  )
  .output(
    z.object({
      campaignId: z.number().describe('ID of the created campaign'),
      name: z.string().describe('Campaign name'),
      status: z.string().describe('Campaign status (should be DRAFT)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companyId: ctx.config.companyId
    });

    let buildStep = (step: (typeof ctx.input.steps)[0], isFirst: boolean) => {
      let body: any = {};

      if (step.type === 'EMAIL' || !step.type) {
        body.versions = (step.versions ?? []).map(v => ({
          subject: v.subject,
          message: v.message,
          signature: v.signature ?? 'SENDER',
          track_opens: v.trackOpens ?? true
        }));
      }

      if (step.linkedinMessage) {
        body.message = step.linkedinMessage;
      }

      let result: any = {
        type: step.type ?? 'EMAIL',
        body
      };

      if (step.deliveryTime) {
        result.delivery_time = step.deliveryTime;
      }

      if (!isFirst && step.delayDays) {
        result.followup_after = { range: 'DAY', value: step.delayDays };
      }

      return result;
    };

    // Build nested step structure (Woodpecker uses nested followup pattern)
    let stepsPayload: any = null;
    for (let i = ctx.input.steps.length - 1; i >= 0; i--) {
      let step = buildStep(ctx.input.steps[i]!, i === 0);
      if (stepsPayload !== null) {
        step.followup = stepsPayload;
      }
      stepsPayload = step;
    }

    // Wrap first step in START type
    let payload: any = {
      name: ctx.input.name,
      steps: {
        type: 'START',
        followup: stepsPayload
      }
    };

    if (ctx.input.emailAccountIds) {
      payload.email_account_ids = ctx.input.emailAccountIds;
    }

    let settings: any = {};
    if (ctx.input.timezone) settings.timezone = ctx.input.timezone;
    if (ctx.input.prospectTimezone !== undefined)
      settings.prospect_timezone = ctx.input.prospectTimezone;
    if (ctx.input.dailyEnroll !== undefined) settings.daily_enroll = ctx.input.dailyEnroll;
    if (ctx.input.gdprUnsubscribe !== undefined)
      settings.gdpr_unsubscribe = ctx.input.gdprUnsubscribe;
    if (ctx.input.listUnsubscribe !== undefined)
      settings.list_unsubscribe = ctx.input.listUnsubscribe;
    if (ctx.input.trackOpens !== undefined)
      settings.open_disabled_list = !ctx.input.trackOpens;

    if (Object.keys(settings).length > 0) {
      payload.settings = settings;
    }

    let result = await client.createCampaign(payload);

    return {
      output: {
        campaignId: result.id ?? result.campaign_id,
        name: result.name ?? ctx.input.name,
        status: result.status ?? 'DRAFT'
      },
      message: `Created campaign **${result.name ?? ctx.input.name}** (ID: ${result.id ?? result.campaign_id}).`
    };
  })
  .build();
