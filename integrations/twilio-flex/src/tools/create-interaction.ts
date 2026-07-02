import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlexClient } from '../lib/client';
import { spec } from '../spec';

export let createInteractionTool = SlateTool.create(spec, {
  name: 'Create Interaction',
  key: 'create_interaction',
  description: `Create a new customer interaction in Twilio Flex. Use this to initiate inbound or outbound conversations across channels (SMS, WhatsApp, web chat, voice). Specify the channel type, routing configuration, and participant details.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelType: z
        .enum(['sms', 'whatsapp', 'web', 'voice', 'email', 'custom'])
        .describe('Communication channel type'),
      channelProperties: z
        .record(z.string(), z.string())
        .describe(
          'Channel-specific properties as a JSON object (e.g., {"type": "sms", "to": "+1234567890", "from": "+0987654321"})'
        ),
      routingWorkflowSid: z
        .string()
        .describe('TaskRouter Workflow SID for routing this interaction'),
      routingWorkspaceSid: z.string().describe('TaskRouter Workspace SID'),
      routingAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional routing attributes as key-value pairs'),
      interactionContextJson: z
        .string()
        .optional()
        .describe('JSON string with additional interaction context')
    })
  )
  .output(
    z.object({
      interactionSid: z.string().describe('SID of the created interaction'),
      channelSid: z.string().optional().describe('SID of the created channel'),
      url: z.string().optional().describe('URL of the interaction resource')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlexClient(ctx.auth.token);

    let routing: Record<string, any> = {
      properties: {
        workflow_sid: ctx.input.routingWorkflowSid,
        workspace_sid: ctx.input.routingWorkspaceSid,
        ...(ctx.input.routingAttributes || {})
      }
    };

    let params: Record<string, string | undefined> = {
      Channel: JSON.stringify({
        type: ctx.input.channelType,
        initiated_by: 'api',
        properties: ctx.input.channelProperties
      }),
      Routing: JSON.stringify(routing)
    };

    if (ctx.input.interactionContextJson) {
      params.InteractionContext = ctx.input.interactionContextJson;
    }

    let result = await client.createInteraction(params);

    return {
      output: {
        interactionSid: result.sid,
        channelSid: result.channel?.sid,
        url: result.url
      },
      message: `Created interaction **${result.sid}** on channel type **${ctx.input.channelType}**.`
    };
  })
  .build();
