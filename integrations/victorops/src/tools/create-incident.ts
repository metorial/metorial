import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createIncident = SlateTool.create(spec, {
  name: 'Create Incident',
  key: 'create_incident',
  description: `Create a new incident and page the specified targets. Targets can be users or escalation policies. This replicates the manual incident creation process.`,
  instructions: [
    'Target type must be either "User" or "EscalationPolicy".',
    'The slug for a User target is the username, and for an EscalationPolicy target it is the policy slug.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      summary: z.string().describe('Short summary/title of the incident'),
      details: z.string().describe('Detailed description of the incident'),
      userName: z.string().describe('VictorOps username of the person creating the incident'),
      targets: z
        .array(
          z.object({
            type: z.enum(['User', 'EscalationPolicy']).describe('Type of target to page'),
            slug: z.string().describe('Identifier for the target (username or policy slug)')
          })
        )
        .describe('List of targets to page for this incident'),
      isMultiResponder: z.boolean().optional().describe('Whether to page multiple responders')
    })
  )
  .output(
    z.object({
      incidentNumber: z.string().describe('The created incident number'),
      error: z.string().optional().describe('Error message if creation failed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      apiId: ctx.auth.apiId,
      token: ctx.auth.token
    });

    let result = await client.createIncident({
      summary: ctx.input.summary,
      details: ctx.input.details,
      userName: ctx.input.userName,
      targets: ctx.input.targets,
      isMultiResponder: ctx.input.isMultiResponder
    });

    return {
      output: {
        incidentNumber: String(result?.incidentNumber ?? ''),
        error: result?.error
      },
      message: result?.error
        ? `Failed to create incident: ${result.error}`
        : `Created incident **#${result?.incidentNumber}**.`
    };
  })
  .build();
