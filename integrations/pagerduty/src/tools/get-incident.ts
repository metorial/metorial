import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { spec } from '../spec';

export let getIncident = SlateTool.create(spec, {
  name: 'Get Incident',
  key: 'get_incident',
  description: `Get detailed information about a specific PagerDuty incident, including its notes, assignments, alerts, and timeline. Optionally fetch the incident's notes.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      incidentId: z.string().describe('Incident ID to retrieve'),
      includeNotes: z.boolean().optional().describe('Also fetch incident notes')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Incident ID'),
      incidentNumber: z.number().optional().describe('Incident number'),
      title: z.string().optional().describe('Incident title'),
      description: z.string().optional().describe('Incident description'),
      status: z.string().optional().describe('Current status'),
      urgency: z.string().optional().describe('Urgency level'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      htmlUrl: z.string().optional().describe('Web URL'),
      incidentKey: z.string().optional().describe('Deduplication key'),
      serviceId: z.string().optional().describe('Service ID'),
      serviceName: z.string().optional().describe('Service name'),
      escalationPolicyId: z.string().optional().describe('Escalation policy ID'),
      escalationPolicyName: z.string().optional().describe('Escalation policy name'),
      assignees: z
        .array(
          z.object({
            userId: z.string(),
            userName: z.string().optional(),
            assignedAt: z.string().optional()
          })
        )
        .optional()
        .describe('Current assignees'),
      acknowledgements: z
        .array(
          z.object({
            userId: z.string(),
            userName: z.string().optional(),
            acknowledgedAt: z.string().optional()
          })
        )
        .optional()
        .describe('Acknowledgements'),
      priority: z.string().optional().describe('Priority name'),
      alertCounts: z
        .object({
          total: z.number(),
          triggered: z.number(),
          resolved: z.number()
        })
        .optional()
        .describe('Alert count summary'),
      notes: z
        .array(
          z.object({
            noteId: z.string(),
            content: z.string().optional(),
            createdAt: z.string().optional(),
            userName: z.string().optional()
          })
        )
        .optional()
        .describe('Incident notes')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PagerDutyClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      region: ctx.config.region
    });

    let incident = await client.getIncident(ctx.input.incidentId);

    let notes:
      | { noteId: string; content?: string; createdAt?: string; userName?: string }[]
      | undefined;
    if (ctx.input.includeNotes) {
      let incidentNotes = await client.listIncidentNotes(ctx.input.incidentId);
      notes = incidentNotes.map(n => ({
        noteId: n.id,
        content: n.content,
        createdAt: n.created_at,
        userName: n.user?.summary
      }));
    }

    return {
      output: {
        incidentId: incident.id,
        incidentNumber: incident.incident_number,
        title: incident.title,
        description: incident.description,
        status: incident.status,
        urgency: incident.urgency,
        createdAt: incident.created_at,
        updatedAt: incident.updated_at,
        htmlUrl: incident.html_url,
        incidentKey: incident.incident_key,
        serviceId: incident.service?.id,
        serviceName: incident.service?.summary,
        escalationPolicyId: incident.escalation_policy?.id,
        escalationPolicyName: incident.escalation_policy?.summary,
        assignees: incident.assignments?.map(a => ({
          userId: a.assignee.id,
          userName: a.assignee.summary,
          assignedAt: a.at
        })),
        acknowledgements: incident.acknowledgements?.map(a => ({
          userId: a.acknowledger.id,
          userName: a.acknowledger.summary,
          acknowledgedAt: a.at
        })),
        priority: incident.priority?.summary || incident.priority?.name,
        alertCounts: incident.alert_counts
          ? {
              total: incident.alert_counts.all,
              triggered: incident.alert_counts.triggered,
              resolved: incident.alert_counts.resolved
            }
          : undefined,
        notes
      },
      message: `Incident **#${incident.incident_number}** — "${incident.title}" (${incident.status}).`
    };
  })
  .build();
