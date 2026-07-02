import { SlateTool } from 'slates';
import { z } from 'zod';
import { datadogServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageIncident = SlateTool.create(spec, {
  name: 'Manage Incident',
  key: 'manage_incident',
  description: `Create or update a Datadog incident. Incidents track and manage service disruptions including severity, customer impact, and resolution status.`,
  instructions: [
    'To create a new incident, omit incidentId and provide at least a title.',
    'To update an existing incident, provide the incidentId with the fields to change.',
    'Severity levels: "SEV-1" (critical) through "SEV-5" (minor), or "UNKNOWN".',
    'States: "active", "stable", "resolved", "completed".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      incidentId: z
        .string()
        .optional()
        .describe('Incident ID to update. Omit to create a new incident.'),
      title: z.string().optional().describe('Incident title (required for creation)'),
      customerImpacted: z
        .boolean()
        .optional()
        .describe('Whether the incident impacts customers (required for creation)'),
      severity: z
        .enum(['SEV-1', 'SEV-2', 'SEV-3', 'SEV-4', 'SEV-5', 'UNKNOWN'])
        .optional()
        .describe('Incident severity'),
      state: z
        .enum(['active', 'stable', 'resolved', 'completed'])
        .optional()
        .describe('Incident state'),
      fields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Custom fields for the incident')
    })
  )
  .output(
    z.object({
      incidentId: z.string().describe('Incident ID'),
      title: z.string().optional().describe('Incident title'),
      customerImpacted: z.boolean().optional().describe('Whether customers are impacted'),
      severity: z.string().optional().describe('Incident severity'),
      state: z.string().optional().describe('Incident state'),
      created: z.string().optional().describe('Creation timestamp'),
      modified: z.string().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let { incidentId, ...data } = ctx.input;
    let result: any;
    let isCreating = !incidentId;

    if (incidentId) {
      result = await client.updateIncident(incidentId, data);
    } else {
      if (!data.title) {
        throw datadogServiceError('title is required when creating a new incident.');
      }
      result = await client.createIncident({
        title: data.title,
        customerImpacted: data.customerImpacted ?? false,
        severity: data.severity,
        fields: data.fields
      });
    }

    let incident = result.data;

    return {
      output: {
        incidentId: incident.id,
        title: incident.attributes?.title,
        customerImpacted: incident.attributes?.customer_impacted,
        severity: incident.attributes?.severity,
        state: incident.attributes?.state,
        created: incident.attributes?.created,
        modified: incident.attributes?.modified
      },
      message: isCreating
        ? `Created incident **${incident.attributes?.title}** (ID: ${incident.id})`
        : `Updated incident **${incident.attributes?.title}** (ID: ${incident.id})`
    };
  })
  .build();
