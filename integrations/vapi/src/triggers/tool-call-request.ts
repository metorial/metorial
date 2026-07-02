import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let toolCallRequest = SlateTrigger.create(spec, {
  name: 'Tool Call Request',
  key: 'tool_call_request',
  description:
    'Triggers when a Vapi assistant invokes a tool/function during a conversation and sends the call to your server. Configure the webhook URL as the Server URL on your Vapi assistant, phone number, or account settings.'
})
  .input(
    z.object({
      eventType: z.string().describe('Event type (tool-calls)'),
      callId: z.string().optional().describe('ID of the call'),
      toolCalls: z
        .array(
          z.object({
            toolCallId: z.string().optional().describe('ID of the tool call'),
            functionName: z.string().optional().describe('Name of the function being called'),
            arguments: z.any().optional().describe('Arguments passed to the function')
          })
        )
        .describe('Array of tool calls'),
      timestamp: z.string().optional().describe('Timestamp of the request'),
      rawPayload: z.any().describe('Raw event payload from Vapi')
    })
  )
  .output(
    z.object({
      callId: z.string().optional().describe('ID of the call'),
      toolCallId: z.string().optional().describe('ID of the tool call'),
      functionName: z.string().optional().describe('Name of the function being called'),
      arguments: z.any().optional().describe('Arguments passed to the function'),
      assistantId: z.string().optional().describe('Assistant ID that made the tool call')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let message = data.message || data;

      if (message.type !== 'tool-calls' && message.type !== 'function-call') {
        return { inputs: [] };
      }

      let call = message.call || {};
      let toolCalls = message.toolCalls || message.toolCallList || [];

      if (message.functionCall) {
        toolCalls = [
          {
            id: message.functionCall.id,
            function: {
              name: message.functionCall.name,
              arguments: message.functionCall.parameters
            }
          }
        ];
      }

      let mappedToolCalls = toolCalls.map((tc: any) => ({
        toolCallId: tc.id,
        functionName: tc.function?.name || tc.name,
        arguments: tc.function?.arguments
          ? typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments
          : tc.parameters
      }));

      return {
        inputs: [
          {
            eventType: message.type,
            callId: call.id,
            toolCalls: mappedToolCalls,
            timestamp: message.timestamp || new Date().toISOString(),
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let firstToolCall = ctx.input.toolCalls[0];
      let message = ctx.input.rawPayload.message || ctx.input.rawPayload;
      let call = message.call || {};

      return {
        type: 'call.tool_call',
        id: `${ctx.input.callId || 'unknown'}-${firstToolCall?.toolCallId || 'tc'}-${ctx.input.timestamp || Date.now()}`,
        output: {
          callId: ctx.input.callId,
          toolCallId: firstToolCall?.toolCallId,
          functionName: firstToolCall?.functionName,
          arguments: firstToolCall?.arguments,
          assistantId: call.assistantId
        }
      };
    }
  })
  .build();
