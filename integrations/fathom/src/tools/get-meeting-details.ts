import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let transcriptEntrySchema = z.object({
  speakerName: z.string().describe('Display name of the speaker'),
  speakerEmail: z
    .string()
    .nullable()
    .describe('Matched calendar invitee email of the speaker'),
  text: z.string().describe('Spoken text'),
  timestamp: z.string().describe('Timestamp in HH:MM:SS format')
});

let summarySchema = z.object({
  templateName: z.string().nullable().describe('Name of the summary template used'),
  content: z.string().nullable().describe('AI-generated summary in Markdown format')
});

let actionItemSchema = z.object({
  description: z.string().describe('Description of the action item'),
  assigneeName: z.string().nullable().describe('Name of the assignee'),
  assigneeEmail: z.string().nullable().describe('Email of the assignee'),
  assigneeTeam: z.string().nullable().describe('Team of the assignee'),
  completed: z.boolean().describe('Whether the action item is completed'),
  momentUrl: z.string().nullable().describe('Link to the relevant moment in the recording')
});

export let getMeetingDetails = SlateTool.create(spec, {
  name: 'Get Meeting Details',
  key: 'get_meeting_details',
  description: `Retrieve the full details for a specific meeting recording, including transcript, AI summary, and action items. Fetches data from dedicated endpoints for maximum completeness.

Provide the **recordingId** from a meeting listing to fetch its details.`,
  instructions: [
    'Use the recordingId from the list-meetings tool to identify which meeting to retrieve.',
    'Set includeTranscript, includeSummary, and includeActionItems to control which data is fetched.'
  ],
  constraints: [
    'Each data type (transcript, summary) requires a separate API call.',
    'Action items are fetched by searching recent meetings — may not be found for very old recordings.',
    'Rate limited to 60 requests per minute total.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      recordingId: z.number().describe('The recording ID of the meeting'),
      includeTranscript: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to fetch the full transcript'),
      includeSummary: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to fetch the AI summary'),
      includeActionItems: z
        .boolean()
        .optional()
        .default(true)
        .describe('Whether to fetch action items')
    })
  )
  .output(
    z.object({
      transcript: z
        .array(transcriptEntrySchema)
        .nullable()
        .describe('Full speaker-labeled transcript'),
      summary: summarySchema.nullable().describe('AI-generated meeting summary'),
      actionItems: z.array(actionItemSchema).nullable().describe('AI-extracted action items')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { recordingId, includeTranscript, includeSummary, includeActionItems } = ctx.input;

    let transcript: z.infer<typeof transcriptEntrySchema>[] | null = null;
    let summary: z.infer<typeof summarySchema> | null = null;
    let actionItems: z.infer<typeof actionItemSchema>[] | null = null;

    // Fetch transcript if requested
    if (includeTranscript) {
      try {
        let transcriptData = await client.getTranscript(recordingId);
        transcript = (transcriptData.transcript || []).map(entry => ({
          speakerName: entry.speaker.display_name,
          speakerEmail: entry.speaker.matched_calendar_invitee_email,
          text: entry.text,
          timestamp: entry.timestamp
        }));
      } catch (err) {
        ctx.warn({ message: 'Failed to fetch transcript', error: err });
      }
    }

    // Fetch summary if requested
    if (includeSummary) {
      try {
        let summaryData = await client.getSummary(recordingId);
        summary = {
          templateName: summaryData.summary.template_name,
          content: summaryData.summary.markdown_formatted
        };
      } catch (err) {
        ctx.warn({ message: 'Failed to fetch summary', error: err });
      }
    }

    // Fetch action items by searching through meetings list (no dedicated endpoint exists)
    if (includeActionItems) {
      try {
        let cursor: string | undefined;
        let found = false;
        let maxPages = 5;

        while (!found && maxPages > 0) {
          let meetingsData = await client.listMeetings({
            includeActionItems: true,
            cursor
          });

          let meeting = meetingsData.items.find(m => m.recording_id === recordingId);
          if (meeting?.action_items) {
            actionItems = meeting.action_items.map(item => ({
              description: item.description,
              assigneeName: item.assignee?.name ?? null,
              assigneeEmail: item.assignee?.email ?? null,
              assigneeTeam: item.assignee?.team ?? null,
              completed: item.completed,
              momentUrl: item.url
            }));
            found = true;
          }

          cursor = meetingsData.next_cursor || undefined;
          if (!cursor) break;
          maxPages--;
        }
      } catch (err) {
        ctx.warn({ message: 'Failed to fetch action items', error: err });
      }
    }

    let parts: string[] = [];
    if (transcript) parts.push(`**${transcript.length}** transcript entries`);
    if (summary?.content) parts.push('AI summary');
    if (actionItems) parts.push(`**${actionItems.length}** action items`);

    return {
      output: {
        transcript,
        summary,
        actionItems
      },
      message:
        parts.length > 0
          ? `Retrieved ${parts.join(', ')} for recording **${recordingId}**.`
          : `No data available for recording **${recordingId}**.`
    };
  })
  .build();
