import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageCall = SlateTool.create(spec, {
  name: 'Manage Call',
  key: 'manage_call',
  description: `Create, retrieve, or delete Vapi voice calls. Create outbound phone calls or web calls using a specific assistant. Retrieve call details including status, transcript, recording URLs, and cost breakdown.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'delete']).describe('Action to perform'),
      callId: z.string().optional().describe('Call ID (required for get, delete)'),
      assistantId: z
        .string()
        .optional()
        .describe('Assistant ID to use for the call (for create)'),
      squadId: z.string().optional().describe('Squad ID to use for the call (for create)'),
      workflowId: z
        .string()
        .optional()
        .describe('Workflow ID to use for the call (for create)'),
      phoneNumberId: z
        .string()
        .optional()
        .describe('Vapi phone number ID to call from (for outbound calls)'),
      customerNumber: z
        .string()
        .optional()
        .describe('Customer phone number to call (E.164 format, for outbound calls)'),
      customerSipUri: z
        .string()
        .optional()
        .describe('Customer SIP URI to call (for outbound SIP calls)'),
      customerName: z.string().optional().describe('Customer name for context'),
      scheduledAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp to schedule the call for a future time'),
      maxDurationSeconds: z.number().optional().describe('Maximum call duration in seconds'),
      serverUrl: z
        .string()
        .optional()
        .describe('Server URL for receiving webhook events for this call')
    })
  )
  .output(
    z.object({
      callId: z.string().optional().describe('ID of the call'),
      type: z
        .string()
        .optional()
        .describe('Call type (inboundPhoneCall, outboundPhoneCall, webCall)'),
      status: z
        .string()
        .optional()
        .describe('Call status (scheduled, queued, ringing, in-progress, forwarding, ended)'),
      assistantId: z.string().optional().describe('Assistant ID used for the call'),
      phoneNumberId: z.string().optional().describe('Phone number ID used'),
      startedAt: z.string().optional().describe('Call start timestamp'),
      endedAt: z.string().optional().describe('Call end timestamp'),
      endedReason: z.string().optional().describe('Reason the call ended'),
      duration: z.number().optional().describe('Call duration in seconds'),
      transcript: z.string().optional().describe('Full call transcript'),
      recordingUrl: z.string().optional().describe('URL to the call recording'),
      summary: z.string().optional().describe('AI-generated call summary'),
      costBreakdown: z.any().optional().describe('Cost breakdown by component'),
      messages: z.any().optional().describe('Conversation messages'),
      deleted: z.boolean().optional().describe('Whether the call was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let { action, callId } = ctx.input;

    if (action === 'get') {
      if (!callId) throw new Error('callId is required for get action');
      let call = await client.getCall(callId);
      return {
        output: {
          callId: call.id,
          type: call.type,
          status: call.status,
          assistantId: call.assistantId,
          phoneNumberId: call.phoneNumberId,
          startedAt: call.startedAt,
          endedAt: call.endedAt,
          endedReason: call.endedReason,
          duration: call.duration,
          transcript: call.artifact?.transcript,
          recordingUrl: call.artifact?.recordingUrl,
          summary: call.analysis?.summary,
          costBreakdown: call.costBreakdown,
          messages: call.messages
        },
        message: `Retrieved call **${call.id}** (status: ${call.status}).`
      };
    }

    if (action === 'delete') {
      if (!callId) throw new Error('callId is required for delete action');
      await client.deleteCall(callId);
      return {
        output: { callId, deleted: true },
        message: `Deleted call **${callId}**.`
      };
    }

    if (action === 'create') {
      let body: Record<string, any> = {};

      if (ctx.input.assistantId) body.assistantId = ctx.input.assistantId;
      if (ctx.input.squadId) body.squadId = ctx.input.squadId;
      if (ctx.input.workflowId) body.workflowId = ctx.input.workflowId;
      if (ctx.input.phoneNumberId) body.phoneNumberId = ctx.input.phoneNumberId;
      if (ctx.input.maxDurationSeconds) body.maxDurationSeconds = ctx.input.maxDurationSeconds;
      if (ctx.input.serverUrl) body.serverUrl = ctx.input.serverUrl;
      if (ctx.input.scheduledAt) body.scheduledAt = ctx.input.scheduledAt;

      if (ctx.input.customerNumber || ctx.input.customerSipUri || ctx.input.customerName) {
        body.customer = {} as Record<string, any>;
        if (ctx.input.customerNumber) body.customer.number = ctx.input.customerNumber;
        if (ctx.input.customerSipUri) body.customer.sipUri = ctx.input.customerSipUri;
        if (ctx.input.customerName) body.customer.name = ctx.input.customerName;
      }

      let call = await client.createCall(body);
      return {
        output: {
          callId: call.id,
          type: call.type,
          status: call.status,
          assistantId: call.assistantId,
          phoneNumberId: call.phoneNumberId,
          startedAt: call.startedAt
        },
        message: `Created ${call.type || 'call'} **${call.id}** (status: ${call.status}).`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
