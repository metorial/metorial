import { SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

export let makePhoneCall = SlateTool.create(spec, {
  name: 'Make Phone Call',
  key: 'make_phone_call',
  description: `Initiate an outbound phone call. Specify the source number (must be owned/imported in Retell) and destination number. Optionally override the agent, inject dynamic variables, or attach metadata.`,
  constraints: [
    'Source number must be purchased from or imported to Retell in E.164 format.',
    'Destination US numbers supported for Retell-purchased numbers.'
  ]
})
  .input(
    z.object({
      fromNumber: z
        .string()
        .describe('Source phone number in E.164 format (e.g. +14157774444)'),
      toNumber: z
        .string()
        .describe('Destination phone number in E.164 format (e.g. +12137774445)'),
      overrideAgentId: z
        .string()
        .optional()
        .describe('Agent ID to use for this call only, overriding the number default'),
      dynamicVariables: z
        .record(z.string(), z.string())
        .optional()
        .describe('Key-value pairs to inject into the prompt and tool descriptions'),
      metadata: z
        .record(z.string(), z.any())
        .optional()
        .describe('Arbitrary metadata to attach to the call')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('Unique identifier of the created call'),
      agentId: z.string().describe('Agent ID used for the call'),
      callStatus: z.string().describe('Current status of the call'),
      fromNumber: z.string().describe('Source phone number'),
      toNumber: z.string().describe('Destination phone number'),
      direction: z.string().describe('Call direction (always "outbound")')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);

    let body: Record<string, any> = {
      from_number: ctx.input.fromNumber,
      to_number: ctx.input.toNumber
    };

    if (ctx.input.overrideAgentId) body.override_agent_id = ctx.input.overrideAgentId;
    if (ctx.input.dynamicVariables)
      body.retell_llm_dynamic_variables = ctx.input.dynamicVariables;
    if (ctx.input.metadata) body.metadata = ctx.input.metadata;

    let call = await client.createPhoneCall(body);

    return {
      output: {
        callId: call.call_id,
        agentId: call.agent_id,
        callStatus: call.call_status,
        fromNumber: call.from_number,
        toNumber: call.to_number,
        direction: call.direction
      },
      message: `Initiated outbound call **${call.call_id}** from ${call.from_number} to ${call.to_number}.`
    };
  })
  .build();
