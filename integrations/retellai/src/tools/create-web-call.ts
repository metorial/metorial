import { createApiServiceError, SlateTool } from 'slates';
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
      agentVersion: z
        .number()
        .int()
        .min(0)
        .optional()
        .describe('Specific agent version to use'),
      agentTag: z
        .string()
        .min(1)
        .optional()
        .describe('Environment tag such as latest_published; omit agentVersion when supplied'),
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
      callStatus: z.string().optional().describe('Current status of the call'),
      transport: z.string().describe('Browser connection transport'),
      expiresAt: z.number().describe('Access token expiration, Unix milliseconds'),
      iceServers: z
        .array(
          z.object({
            urls: z.union([z.string(), z.array(z.string())]),
            username: z.string().optional(),
            credential: z.string().optional()
          })
        )
        .describe('ICE server configuration for the browser')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RetellClient(ctx.auth.token);

    let body: Record<string, any> = {
      agent_id: ctx.input.agentId
    };

    if (ctx.input.agentVersion !== undefined && ctx.input.agentTag !== undefined) {
      throw createApiServiceError('Provide agentVersion or agentTag, not both.');
    }
    if (ctx.input.agentTag !== undefined) body.agent_version = ctx.input.agentTag;
    if (ctx.input.agentVersion !== undefined) body.agent_version = ctx.input.agentVersion;
    if (ctx.input.dynamicVariables)
      body.retell_llm_dynamic_variables = ctx.input.dynamicVariables;
    if (ctx.input.metadata) body.metadata = ctx.input.metadata;

    let connection = await client.createWebCall(body);

    return {
      output: {
        callId: connection.call_id,
        accessToken: connection.access_token,
        transport: connection.transport,
        expiresAt: connection.expires_at,
        iceServers: connection.ice_servers,
        agentId: ctx.input.agentId,
        callStatus: connection.call_status
      },
      message: `Created web call **${connection.call_id}** with agent ${ctx.input.agentId}.`
    };
  })
  .build();
