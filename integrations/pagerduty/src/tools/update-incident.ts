import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { spec } from '../spec';

export let updateIncident = SlateTool.create(spec, {
  name: 'Update Incident',
  key: 'update_incident',
  description: `Update a PagerDuty incident — acknowledge, resolve, reassign, change urgency, escalation policy, priority, or add a note. Also supports snoozing and merging incidents.`,
  instructions: [
    'Set **status** to "acknowledged", "resolved", or "triggered" to change incident state.',
    'To snooze, provide **snoozeDurationSeconds** (the incident will re-trigger after the duration).',
    'To merge incidents, provide **mergeSourceIncidentIds** — the specified incidents will be merged into this one.',
    'To add a note, provide **noteContent**.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      incidentId: z.string().describe('Incident ID to update'),
      fromEmail: z.string().describe('Email of the PagerDuty user performing the update'),
      status: z
        .enum(['triggered', 'acknowledged', 'resolved'])
        .optional()
        .describe('New incident status'),
      title: z.string().optional().describe('New title'),
      urgency: z.enum(['high', 'low']).optional().describe('New urgency level'),
      escalationPolicyId: z.string().optional().describe('New escalation policy ID'),
      assigneeIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to reassign the incident to'),
      priorityId: z.string().optional().describe('Priority ID to set'),
      resolution: z.string().optional().describe('Resolution note (used when resolving)'),
      conferenceNumber: z.string().optional().describe('Conference bridge phone number'),
      conferenceUrl: z.string().optional().describe('Conference bridge URL'),
      noteContent: z.string().optional().describe('Content of a note to add to the incident'),
      snoozeDurationSeconds: z
        .number()
        .optional()
        .describe('Duration in seconds to snooze the incident'),
      mergeSourceIncidentIds: z
        .array(z.string())
        .optional()
        .describe('Incident IDs to merge into this incident')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Updated incident ID'),
      incidentNumber: z.number().optional().describe('Incident number'),
      title: z.string().optional().describe('Incident title'),
      status: z.string().optional().describe('Current status'),
      urgency: z.string().optional().describe('Urgency level'),
      htmlUrl: z.string().optional().describe('Web URL'),
      noteId: z.string().optional().describe('ID of the added note (if a note was created)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PagerDutyClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      region: ctx.config.region
    });

    let actions: string[] = [];
    let incident = await client.getIncident(ctx.input.incidentId);
    let noteId: string | undefined;

    // Handle snooze
    if (ctx.input.snoozeDurationSeconds) {
      incident = await client.snoozeIncident(
        ctx.input.incidentId,
        ctx.input.snoozeDurationSeconds,
        ctx.input.fromEmail
      );
      actions.push(`snoozed for ${ctx.input.snoozeDurationSeconds}s`);
    }

    // Handle merge
    if (ctx.input.mergeSourceIncidentIds && ctx.input.mergeSourceIncidentIds.length > 0) {
      incident = await client.mergeIncidents(
        ctx.input.incidentId,
        ctx.input.mergeSourceIncidentIds,
        ctx.input.fromEmail
      );
      actions.push(`merged ${ctx.input.mergeSourceIncidentIds.length} incident(s)`);
    }

    // Handle core update
    let hasUpdate =
      ctx.input.status ||
      ctx.input.title ||
      ctx.input.urgency ||
      ctx.input.escalationPolicyId ||
      ctx.input.assigneeIds ||
      ctx.input.priorityId ||
      ctx.input.conferenceNumber ||
      ctx.input.conferenceUrl ||
      ctx.input.resolution;

    if (hasUpdate) {
      incident = await client.updateIncident(
        ctx.input.incidentId,
        {
          status: ctx.input.status,
          title: ctx.input.title,
          urgency: ctx.input.urgency,
          escalationPolicyId: ctx.input.escalationPolicyId,
          assignmentIds: ctx.input.assigneeIds,
          priorityId: ctx.input.priorityId,
          conferenceNumber: ctx.input.conferenceNumber,
          conferenceUrl: ctx.input.conferenceUrl,
          resolution: ctx.input.resolution
        },
        ctx.input.fromEmail
      );

      if (ctx.input.status) actions.push(`status → ${ctx.input.status}`);
      if (ctx.input.title) actions.push('title updated');
      if (ctx.input.urgency) actions.push(`urgency → ${ctx.input.urgency}`);
      if (ctx.input.assigneeIds) actions.push('reassigned');
      if (ctx.input.priorityId) actions.push('priority updated');
    }

    // Handle note
    if (ctx.input.noteContent) {
      let note = await client.addIncidentNote(
        ctx.input.incidentId,
        ctx.input.noteContent,
        ctx.input.fromEmail
      );
      noteId = note.id;
      actions.push('note added');
    }

    return {
      output: {
        incidentId: incident.id,
        incidentNumber: incident.incident_number,
        title: incident.title,
        status: incident.status,
        urgency: incident.urgency,
        htmlUrl: incident.html_url,
        noteId
      },
      message: `Updated incident **#${incident.incident_number}**: ${actions.length > 0 ? actions.join(', ') : 'no changes applied'}.`
    };
  })
  .build();
