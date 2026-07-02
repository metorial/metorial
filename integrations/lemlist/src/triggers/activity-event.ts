import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let activityEvent = SlateTrigger.create(spec, {
  name: 'Activity Event',
  key: 'activity_event',
  description:
    'Triggers when an activity event occurs in Lemlist, including email events (sent, opened, clicked, replied, bounced), LinkedIn events (invite sent, replied), phone events, campaign lifecycle events, and enrichment events.'
})
  .input(
    z.object({
      eventType: z.string().describe('The type of activity event'),
      eventId: z.string().describe('Unique identifier for this event'),
      leadEmail: z.string().optional(),
      leadFirstName: z.string().optional(),
      leadLastName: z.string().optional(),
      leadId: z.string().optional(),
      campaignId: z.string().optional(),
      campaignName: z.string().optional(),
      payload: z.record(z.string(), z.any()).describe('Full event payload from Lemlist')
    })
  )
  .output(
    z.object({
      activityType: z
        .string()
        .describe('The type of activity (e.g., emailsSent, emailsOpened, linkedinReplied)'),
      leadId: z.string().optional(),
      leadEmail: z.string().optional(),
      leadFirstName: z.string().optional(),
      leadLastName: z.string().optional(),
      leadCompanyName: z.string().optional(),
      campaignId: z.string().optional(),
      campaignName: z.string().optional(),
      sequenceStep: z.number().optional(),
      sendUserEmail: z.string().optional(),
      sendUserName: z.string().optional(),
      createdAt: z.string().optional(),
      isFirst: z.boolean().optional(),
      errorMessage: z.string().optional()
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      // Register a webhook that listens to all event types
      let hook = await client.createWebhook(ctx.input.webhookBaseUrl);

      return {
        registrationDetails: {
          hookId: hook._id
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { hookId: string };

      await client.deleteWebhook(details.hookId);
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // Lemlist webhook payload contains the event data directly
      let eventType = data.type ?? 'unknown';
      let eventId = data._id ?? `${eventType}_${data.leadId ?? ''}_${Date.now()}`;

      return {
        inputs: [
          {
            eventType,
            eventId,
            leadEmail: data.leadEmail ?? data.email,
            leadFirstName: data.leadFirstName ?? data.firstName,
            leadLastName: data.leadLastName ?? data.lastName,
            leadId: data.leadId,
            campaignId: data.campaignId,
            campaignName: data.campaignName,
            payload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let { eventType, eventId, payload } = ctx.input;
      let p = payload as Record<string, any>;

      // Normalize event type to dot-notation (e.g., emailsSent -> email.sent)
      let normalizedType = normalizeEventType(eventType);

      return {
        type: normalizedType,
        id: eventId,
        output: {
          activityType: eventType,
          leadId: p.leadId as string | undefined,
          leadEmail: (p.leadEmail ?? p.email) as string | undefined,
          leadFirstName: (p.leadFirstName ?? p.firstName) as string | undefined,
          leadLastName: (p.leadLastName ?? p.lastName) as string | undefined,
          leadCompanyName: (p.leadCompanyName ?? p.companyName) as string | undefined,
          campaignId: p.campaignId as string | undefined,
          campaignName: p.campaignName as string | undefined,
          sequenceStep: p.sequenceStep as number | undefined,
          sendUserEmail: p.sendUserEmail as string | undefined,
          sendUserName: p.userName as string | undefined,
          createdAt: p.createdAt as string | undefined,
          isFirst: p.isFirst as boolean | undefined,
          errorMessage: p.errorMessage as string | undefined
        }
      };
    }
  })
  .build();

let normalizeEventType = (type: string): string => {
  let mapping: Record<string, string> = {
    emailsSent: 'email.sent',
    emailsOpened: 'email.opened',
    emailsClicked: 'email.clicked',
    emailsReplied: 'email.replied',
    emailsBounced: 'email.bounced',
    emailsSendFailed: 'email.send_failed',
    emailsFailed: 'email.failed',
    emailsUnsubscribed: 'email.unsubscribed',
    emailsInterested: 'email.interested',
    emailsNotInterested: 'email.not_interested',
    emailsDone: 'email.done',
    linkedinVisitDone: 'linkedin.visit_done',
    linkedinVisitFailed: 'linkedin.visit_failed',
    linkedinInviteDone: 'linkedin.invite_done',
    linkedinInviteFailed: 'linkedin.invite_failed',
    linkedinInviteAccepted: 'linkedin.invite_accepted',
    linkedinSent: 'linkedin.sent',
    linkedinSendFailed: 'linkedin.send_failed',
    linkedinReplied: 'linkedin.replied',
    linkedinInterested: 'linkedin.interested',
    linkedinNotInterested: 'linkedin.not_interested',
    linkedinVoiceNoteDone: 'linkedin.voice_note_done',
    linkedinVoiceNoteFailed: 'linkedin.voice_note_failed',
    aircallCreated: 'call.created',
    aircallEnded: 'call.ended',
    aircallDone: 'call.done',
    aircallInterested: 'call.interested',
    aircallNotInterested: 'call.not_interested',
    apiDone: 'api.done',
    apiInterested: 'api.interested',
    apiNotInterested: 'api.not_interested',
    apiFailed: 'api.failed',
    manualInterested: 'manual.interested',
    manualNotInterested: 'manual.not_interested',
    contacted: 'campaign.contacted',
    hooked: 'campaign.hooked',
    attracted: 'campaign.attracted',
    warmed: 'campaign.warmed',
    interested: 'campaign.interested',
    notInterested: 'campaign.not_interested',
    skipped: 'campaign.skipped',
    paused: 'lead.paused',
    resumed: 'lead.resumed',
    campaignComplete: 'campaign.complete',
    enrichmentDone: 'enrichment.done',
    enrichmentError: 'enrichment.error',
    customDomainErrors: 'alert.custom_domain_errors',
    connectionIssue: 'alert.connection_issue',
    sendLimitReached: 'alert.send_limit_reached',
    lemwarmPaused: 'alert.lemwarm_paused',
    annotated: 'lead.annotated'
  };

  return mapping[type] ?? `activity.${type}`;
};
