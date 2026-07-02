import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transcriptEntrySchema = z.object({
  speakerName: z.string().describe('Display name of the speaker'),
  speakerEmail: z.string().nullable().describe('Matched calendar invitee email'),
  text: z.string().describe('Spoken text'),
  timestamp: z.string().describe('Timestamp in HH:MM:SS format')
});

let summarySchema = z.object({
  templateName: z.string().nullable().describe('Summary template name'),
  content: z.string().nullable().describe('Markdown-formatted summary')
});

let actionItemSchema = z.object({
  description: z.string().describe('Action item description'),
  assigneeName: z.string().nullable().describe('Name of the assignee'),
  assigneeEmail: z.string().nullable().describe('Email of the assignee'),
  assigneeTeam: z.string().nullable().describe('Team of the assignee'),
  completed: z.boolean().describe('Whether the action item is completed'),
  momentUrl: z.string().nullable().describe('Link to the moment in recording')
});

let crmMatchSchema = z.object({
  contacts: z
    .array(
      z.object({
        name: z.string(),
        email: z.string().nullable(),
        url: z.string().nullable()
      })
    )
    .describe('Matched CRM contacts'),
  companies: z
    .array(
      z.object({
        name: z.string(),
        url: z.string().nullable()
      })
    )
    .describe('Matched CRM companies'),
  deals: z
    .array(
      z.object({
        name: z.string(),
        amount: z.number().nullable(),
        url: z.string().nullable()
      })
    )
    .describe('Matched CRM deals')
});

let webhookPayloadSchema = z.object({
  recordingId: z.number().describe('Recording ID of the meeting'),
  title: z.string().describe('Meeting title'),
  meetingTitle: z.string().nullable().describe('Calendar event title'),
  meetingUrl: z.string().describe('URL to the meeting in Fathom'),
  shareUrl: z.string().describe('Shareable meeting link'),
  createdAt: z.string().describe('When the meeting was created'),
  scheduledStartTime: z.string().nullable().describe('Calendar start time'),
  scheduledEndTime: z.string().nullable().describe('Calendar end time'),
  recordingStartTime: z.string().nullable().describe('Actual recording start'),
  recordingEndTime: z.string().nullable().describe('Actual recording end'),
  domainsType: z.string().nullable().describe('Internal or external meeting'),
  transcriptLanguage: z.string().nullable().describe('Transcript language code'),
  recordedBy: z
    .object({
      displayName: z.string(),
      email: z.string()
    })
    .nullable()
    .describe('User who recorded'),
  calendarInvitees: z
    .array(
      z.object({
        displayName: z.string(),
        email: z.string()
      })
    )
    .describe('Calendar invitees'),
  transcript: z
    .array(transcriptEntrySchema)
    .nullable()
    .describe('Full transcript if included'),
  summary: summarySchema.nullable().describe('AI summary if included'),
  actionItems: z.array(actionItemSchema).nullable().describe('Action items if included'),
  crmMatches: crmMatchSchema.nullable().describe('CRM matches if included')
});

export let meetingContentReady = SlateTrigger.create(spec, {
  name: 'Meeting Content Ready',
  key: 'meeting_content_ready',
  description:
    'Fires when a recorded meeting has been fully processed and its content (transcript, summary, action items) is available. Fathom automatically delivers the meeting data to your webhook URL.'
})
  .input(
    z.object({
      webhookId: z.string().describe('Webhook ID from Fathom'),
      webhookTimestamp: z.string().describe('Timestamp from the webhook header'),
      meeting: z.any().describe('Raw meeting payload from the webhook')
    })
  )
  .output(webhookPayloadSchema)
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let webhook = await client.createWebhook({
        destinationUrl: ctx.input.webhookBaseUrl,
        triggeredFor: ['my_recordings', 'shared_team_recordings'],
        includeTranscript: true,
        includeSummary: true,
        includeActionItems: true,
        includeCrmMatches: true
      });

      return {
        registrationDetails: {
          webhookId: webhook.id,
          webhookSecret: webhook.secret
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({ token: ctx.auth.token });
      let details = ctx.input.registrationDetails as { webhookId: string };
      await client.deleteWebhook(details.webhookId);
    },

    handleRequest: async ctx => {
      let body = await ctx.request.json();

      let webhookId = ctx.request.headers.get('webhook-id') || '';
      let webhookTimestamp = ctx.request.headers.get('webhook-timestamp') || '';

      return {
        inputs: [
          {
            webhookId,
            webhookTimestamp,
            meeting: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let meeting = ctx.input.meeting;

      let transcript = meeting.transcript
        ? (Array.isArray(meeting.transcript) ? meeting.transcript : []).map((entry: any) => ({
            speakerName: entry.speaker?.display_name || '',
            speakerEmail: entry.speaker?.matched_calendar_invitee_email || null,
            text: entry.text || '',
            timestamp: entry.timestamp || ''
          }))
        : null;

      let summary = meeting.default_summary
        ? {
            templateName: meeting.default_summary.template_name || null,
            content: meeting.default_summary.markdown_formatted || null
          }
        : null;

      let actionItems = meeting.action_items
        ? (Array.isArray(meeting.action_items) ? meeting.action_items : []).map(
            (item: any) => ({
              description: item.description || '',
              assigneeName: item.assignee?.name || null,
              assigneeEmail: item.assignee?.email || null,
              assigneeTeam: item.assignee?.team || null,
              completed: item.completed || false,
              momentUrl: item.url || null
            })
          )
        : null;

      let crmMatches = meeting.crm_matches
        ? {
            contacts: (meeting.crm_matches.contacts || []).map((c: any) => ({
              name: c.name || '',
              email: c.email || null,
              url: c.url || null
            })),
            companies: (meeting.crm_matches.companies || []).map((c: any) => ({
              name: c.name || '',
              url: c.url || null
            })),
            deals: (meeting.crm_matches.deals || []).map((d: any) => ({
              name: d.name || '',
              amount: d.amount ?? null,
              url: d.url || null
            }))
          }
        : null;

      return {
        type: 'meeting.content_ready',
        id:
          ctx.input.webhookId ||
          `meeting-${meeting.recording_id}-${ctx.input.webhookTimestamp}`,
        output: {
          recordingId: meeting.recording_id,
          title: meeting.title || '',
          meetingTitle: meeting.meeting_title || null,
          meetingUrl: meeting.url || '',
          shareUrl: meeting.share_url || '',
          createdAt: meeting.created_at || '',
          scheduledStartTime: meeting.scheduled_start_time || null,
          scheduledEndTime: meeting.scheduled_end_time || null,
          recordingStartTime: meeting.recording_start_time || null,
          recordingEndTime: meeting.recording_end_time || null,
          domainsType: meeting.calendar_invitees_domains_type || null,
          transcriptLanguage: meeting.transcript_language || null,
          recordedBy: meeting.recorded_by
            ? {
                displayName: meeting.recorded_by.display_name || '',
                email: meeting.recorded_by.email || ''
              }
            : null,
          calendarInvitees: (meeting.calendar_invitees || []).map((inv: any) => ({
            displayName: inv.display_name || '',
            email: inv.email || ''
          })),
          transcript,
          summary,
          actionItems,
          crmMatches
        }
      };
    }
  })
  .build();
