import { SlateTool } from 'slates';
import { z } from 'zod';
import { RetellClient } from '../lib/client';
import { spec } from '../spec';

export let createWebCall = SlateTool.create(spec, {
  name: 'Create Web Call',
  key: 'create_web_call',
  description: `Initiate a browser-based voice call via WebRTC. Returns an access token that can be used by the frontend to join the call room. No telephony infrastructure required.`
})
  .input(
    z.object({
      agentId: z.string().describe('Unique ID of the agent to use for the call'),
      agentVersion: z.number().optional().describe('Specific agent version to use'),
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
      accessToken: z.string().describe('JWT token for the frontend to join the call room'),
      agentId: z.string().describe('Agent ID used for the call'),
      callStatus: z.string().describe('Current status of the call')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);

    let body: Record<string, any> = {
      agent_id: ctx.input.agentId
    };

    if (ctx.input.agentVersion !== undefined) body.agent_version = ctx.input.agentVersion;
    if (ctx.input.dynamicVariables)
      body.retell_llm_dynamic_variables = ctx.input.dynamicVariables;
    if (ctx.input.metadata) body.metadata = ctx.input.metadata;

    let call = await client.createWebCall(body);

    return {
      output: {
        callId: call.call_id,
        accessToken: call.access_token,
        agentId: call.agent_id,
        callStatus: call.call_status
      },
      message: `Created web call **${call.call_id}** with agent ${call.agent_id}.`
    };
  })
  .build();
