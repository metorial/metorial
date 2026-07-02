import { SlateTool } from 'slates';
import { z } from 'zod';
import { PagerDutyClient } from '../lib/client';
import { spec } from '../spec';

export let createIncident = SlateTool.create(spec, {
  name: 'Create Incident',
  key: 'create_incident',
  description: `Create a new PagerDuty incident on a specified service. Supports setting urgency, priority, assignments, escalation policy, conference bridge details, and a detailed description body.`,
  instructions: [
    'A **serviceId** and **title** are required. The **fromEmail** must be a valid PagerDuty user email.',
    'Use **assigneeIds** to directly assign to specific users, or let the escalation policy handle routing.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      title: z.string().describe('Incident title'),
      serviceId: z.string().describe('Service ID to create the incident on'),
      fromEmail: z
        .string()
        .describe('Email address of the PagerDuty user creating the incident'),
      urgency: z.enum(['high', 'low']).optional().describe('Incident urgency'),
      body: z.string().optional().describe('Detailed incident body/description'),
      escalationPolicyId: z
        .string()
        .optional()
        .describe('Escalation policy ID to use instead of the service default'),
      assigneeIds: z
        .array(z.string())
        .optional()
        .describe('User IDs to assign the incident to'),
      priorityId: z.string().optional().describe('Priority ID to set on the incident'),
      incidentKey: z.string().optional().describe('Deduplication key for the incident'),
      conferenceNumber: z.string().optional().describe('Conference bridge phone number'),
      conferenceUrl: z.string().optional().describe('Conference bridge URL')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Created incident ID'),
      incidentNumber: z.number().optional().describe('Incident number'),
      title: z.string().optional().describe('Incident title'),
      status: z.string().optional().describe('Incident status'),
      urgency: z.string().optional().describe('Incident urgency'),
      htmlUrl: z.string().optional().describe('Web URL for the incident'),
      serviceId: z.string().optional().describe('Associated service ID'),
      serviceName: z.string().optional().describe('Associated service name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PagerDutyClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      region: ctx.config.region
    });

    let incident = await client.createIncident(
      {
        title: ctx.input.title,
        serviceId: ctx.input.serviceId,
        urgency: ctx.input.urgency,
        body: ctx.input.body,
        escalationPolicyId: ctx.input.escalationPolicyId,
        assignmentIds: ctx.input.assigneeIds,
        priorityId: ctx.input.priorityId,
        incidentKey: ctx.input.incidentKey,
        conferenceNumber: ctx.input.conferenceNumber,
        conferenceUrl: ctx.input.conferenceUrl
      },
      ctx.input.fromEmail
    );

    return {
      output: {
        incidentId: incident.id,
        incidentNumber: incident.incident_number,
        title: incident.title,
        status: incident.status,
        urgency: incident.urgency,
        htmlUrl: incident.html_url,
        serviceId: incident.service?.id,
        serviceName: incident.service?.summary
      },
      message: `Created incident **#${incident.incident_number}** — "${incident.title}" (${incident.status}).`
    };
  })
  .build();
