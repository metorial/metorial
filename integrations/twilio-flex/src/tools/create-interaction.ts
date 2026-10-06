import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlexClient } from '../lib/client';
import { fail, objectJson, validateInput } from '../lib/validation';
import { spec } from '../spec';

export let createInteractionTool = SlateTool.create(spec, {
  name: 'Create Interaction',
  key: 'create_interaction',
  description: `Create a new customer interaction in Twilio Flex. Use this to initiate inbound or outbound conversations across supported messaging channels. Specify the channel type, routing configuration, and participant details.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      channelType: z
        .enum([
          'sms',
          'whatsapp',
          'web',
          'voice',
          'email',
          'custom',
          'chat',
          'messenger',
          'gbm'
        ])
        .describe('Communication channel type'),
      channelProperties: z
        .record(z.string(), z.string())
        .describe(
          'Native channel properties, such as an existing media_channel_sid (CH Conversation SID). Phone addresses belong in native channel participants, outside this input contract.'
        ),
      routingWorkflowSid: z
        .string()
        .describe('TaskRouter Workflow SID for routing this interaction'),
      routingWorkspaceSid: z.string().describe('TaskRouter Workspace SID'),
      routingAttributes: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional routing attributes as key-value pairs'),
      interactionContextSid: z
        .string()
        .optional()
        .describe('Existing HQ context lookup SID; no context is created.'),
      interactionContextJson: z
        .string()
        .optional()
        .describe(
          'Legacy field retained for compatibility; arbitrary InteractionContext JSON is not a documented write field. Use interactionContextSid.'
        )
    })
  )
  .output(
    z.object({
      interactionSid: z.string().describe('SID of the created interaction'),
      channelSid: z.string().optional().describe('SID of the created channel'),
      accepted: z
        .boolean()
        .optional()
        .describe(
          'The request was accepted; channel setup may still fail. Call get_interaction and manage_interaction_channel.'
        ),
      url: z.string().optional().describe('URL of the interaction resource')
    })
  )
  .handleInvocation(async ctx => {
    validateInput('create_interaction', ctx.input);
    let client = new FlexClient(ctx.auth.token, ctx.auth.accountSid);

    const properties: Record<string, unknown> = { ...(ctx.input.routingAttributes ?? {}) };
    for (const key of ['workspace_sid', 'workflow_sid'])
      if (
        properties[key] !== undefined &&
        properties[key] !==
          (key === 'workspace_sid'
            ? ctx.input.routingWorkspaceSid
            : ctx.input.routingWorkflowSid)
      )
        throw fail(
          'Routing attributes cannot override the explicitly selected workspace or workflow.'
        );
    if (typeof properties.attributes === 'string')
      properties.attributes = objectJson(properties.attributes, 'Routing task attributes');
    for (const key of ['priority', 'timeout'])
      if (typeof properties[key] === 'string') {
        const number = Number(properties[key]);
        if (!Number.isSafeInteger(number) || number < 0)
          throw fail('Routing priority/timeout must be a nonnegative safe integer.');
        properties[key] = number;
      }
    let routing: Record<string, unknown> = {
      properties: {
        ...properties,
        workflow_sid: ctx.input.routingWorkflowSid,
        workspace_sid: ctx.input.routingWorkspaceSid
      }
    };

    let params: Record<string, string | undefined> = {
      Channel: JSON.stringify({
        type: ctx.input.channelType,
        initiated_by: 'api',
        properties: ctx.input.channelProperties
      }),
      Routing: JSON.stringify(routing),
      InteractionContextSid: ctx.input.interactionContextSid
    };

    let result = await client.createInteraction(params);

    return {
      output: {
        interactionSid: result.sid,
        accepted: true,
        channelSid: result.channel?.sid,
        url: result.url
      },
      message: `Accepted interaction **${result.sid}**; check its channel status before treating setup as complete on channel type **${ctx.input.channelType}**.`
    };
  })
  .build();
