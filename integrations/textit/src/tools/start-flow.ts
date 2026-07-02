import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let startFlow = SlateTool.create(spec, {
  name: 'Start Flow',
  key: 'start_flow',
  description: `Start contacts in a specific flow. You can target contacts by UUID, group UUID, or URN. Optionally pass extra parameters accessible within the flow via \`@trigger.params\`.`,
  instructions: [
    'At least one of contactUuids, groupUuids, or urns must be provided.',
    'Set restartParticipants to false to skip contacts already in the flow.',
    'Set excludeActive to true to skip contacts currently active in other flows.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      flowUuid: z.string().describe('UUID of the flow to start'),
      contactUuids: z
        .array(z.string())
        .optional()
        .describe('Contact UUIDs to start in the flow (max 100)'),
      groupUuids: z
        .array(z.string())
        .optional()
        .describe('Group UUIDs whose contacts will be started in the flow (max 100)'),
      urns: z.array(z.string()).optional().describe('URNs to start in the flow (max 100)'),
      restartParticipants: z
        .boolean()
        .optional()
        .describe('Whether to restart contacts already in this flow (default: true)'),
      excludeActive: z
        .boolean()
        .optional()
        .describe('Whether to exclude contacts active in other flows (default: false)'),
      params: z
        .record(z.string(), z.any())
        .optional()
        .describe('Extra parameters accessible in the flow via @trigger.params (max 10KB)')
    })
  )
  .output(
    z.object({
      flowStartUuid: z.string().describe('UUID of the created flow start'),
      flowUuid: z.string(),
      flowName: z.string(),
      status: z.string().describe('Status of the flow start (e.g., pending)'),
      createdOn: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let flowStart = await client.startFlow({
      flow: ctx.input.flowUuid,
      contacts: ctx.input.contactUuids,
      groups: ctx.input.groupUuids,
      urns: ctx.input.urns,
      restart_participants: ctx.input.restartParticipants,
      exclude_active: ctx.input.excludeActive,
      params: ctx.input.params
    });

    return {
      output: {
        flowStartUuid: flowStart.uuid,
        flowUuid: flowStart.flow.uuid,
        flowName: flowStart.flow.name,
        status: flowStart.status,
        createdOn: flowStart.created_on
      },
      message: `Flow **${flowStart.flow.name}** started (status: ${flowStart.status}).`
    };
  })
  .build();
