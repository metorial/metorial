import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getExecution = SlateTool.create(spec, {
  name: 'Get Execution',
  key: 'get_execution',
  description: `Retrieve details of a specific call execution including transcript, recording URL, an optional downloadable recording, cost breakdown, telephony metadata, and extracted data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      executionId: z.string().describe('Execution ID of the call'),
      downloadRecording: z
        .boolean()
        .optional()
        .describe('Provide the available call recording as a downloadable file'),
      includeLogs: z
        .boolean()
        .optional()
        .describe('Also fetch raw execution logs (LLM prompts, model requests/responses)')
    })
  )
  .output(
    z.object({
      executionId: z.string().describe('Execution ID'),
      agentId: z.string().optional().describe('Agent ID'),
      batchId: z.string().optional().describe('Batch ID if part of a batch'),
      status: z.string().optional().describe('Call status'),
      transcript: z.string().optional().describe('Full conversation transcript'),
      conversationTime: z.number().optional().describe('Conversation duration in seconds'),
      totalCost: z.number().optional().describe('Total call cost in cents'),
      answeredByVoiceMail: z.boolean().optional().describe('Whether a voicemail answered'),
      errorMessage: z.string().optional().describe('Error message if the call failed'),
      createdAt: z.string().optional().describe('Execution creation timestamp'),
      updatedAt: z.string().optional().describe('Execution last update timestamp'),
      extractedData: z
        .any()
        .optional()
        .describe('Structured data extracted from the conversation'),
      contextDetails: z.any().optional().describe('Custom variables injected into the call'),
      costBreakdown: z
        .object({
          llm: z.number().optional(),
          network: z.number().optional(),
          platform: z.number().optional(),
          synthesizer: z.number().optional(),
          transcriber: z.number().optional()
        })
        .optional()
        .describe('Cost breakdown by component in cents'),
      telephonyData: z
        .object({
          duration: z.string().optional(),
          toNumber: z.string().optional(),
          fromNumber: z.string().optional(),
          recordingUrl: z.string().optional(),
          callType: z.string().optional(),
          telephonyProvider: z.string().optional(),
          hangupBy: z.string().optional(),
          hangupReason: z.string().optional()
        })
        .optional()
        .describe('Telephony call metadata'),
      logs: z
        .array(
          z.object({
            createdAt: z.string().optional(),
            type: z.string().optional(),
            component: z.string().optional(),
            provider: z.string().optional(),
            logData: z.string().optional()
          })
        )
        .optional()
        .describe('Raw execution logs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let exec = await client.getExecution(ctx.input.executionId);

    let logs: any[] | undefined;
    if (ctx.input.includeLogs) {
      let logResult = await client.getExecutionLogs(ctx.input.executionId);
      logs = (logResult.data || []).map((l: any) => ({
        createdAt: l.created_at ?? undefined,
        type: l.type ?? undefined,
        component: l.component ?? undefined,
        provider: l.provider ?? undefined,
        logData: l.data ?? undefined
      }));
    }

    if (ctx.input.downloadRecording) {
      let recordingUrl = exec.telephony_data?.recording_url;
      if (!recordingUrl)
        throw createApiServiceError(
          'No recording is available for this execution. Wait until call processing completes.'
        );
      let url: URL;
      try {
        url = new URL(recordingUrl);
      } catch {
        throw createApiServiceError('Bolna returned an invalid recording URL.');
      }
      if (!['https:', 'http:'].includes(url.protocol))
        throw createApiServiceError('Bolna returned an unsupported recording URL.');
      await ctx.addAttachment({
        type: 'url',
        url,
        headers:
          url.origin === 'https://api.bolna.ai'
            ? { Authorization: `Bearer ${ctx.auth.token}` }
            : undefined
      });
    }

    return {
      output: {
        executionId: exec.id,
        agentId: exec.agent_id ?? undefined,
        batchId: exec.batch_id ?? undefined,
        status: exec.status ?? undefined,
        transcript: exec.transcript ?? undefined,
        conversationTime: exec.conversation_duration ?? exec.conversation_time ?? undefined,
        totalCost: exec.total_cost ?? undefined,
        answeredByVoiceMail: exec.answered_by_voice_mail ?? undefined,
        errorMessage: exec.error_message ?? undefined,
        createdAt: exec.created_at ?? undefined,
        updatedAt: exec.updated_at ?? undefined,
        extractedData: exec.extracted_data,
        contextDetails: exec.context_details,
        costBreakdown: exec.cost_breakdown
          ? {
              llm: exec.cost_breakdown.llm ?? undefined,
              network: exec.cost_breakdown.network ?? undefined,
              platform: exec.cost_breakdown.platform ?? undefined,
              synthesizer: exec.cost_breakdown.synthesizer ?? undefined,
              transcriber: exec.cost_breakdown.transcriber ?? undefined
            }
          : undefined,
        telephonyData: exec.telephony_data
          ? {
              duration:
                exec.telephony_data.duration == null
                  ? undefined
                  : String(exec.telephony_data.duration),
              toNumber: exec.telephony_data.to_number ?? undefined,
              fromNumber: exec.telephony_data.from_number ?? undefined,
              recordingUrl: exec.telephony_data.recording_url ?? undefined,
              callType: exec.telephony_data.call_type ?? undefined,
              telephonyProvider: exec.telephony_data.provider ?? undefined,
              hangupBy: exec.telephony_data.hangup_by ?? undefined,
              hangupReason: exec.telephony_data.hangup_reason ?? undefined
            }
          : undefined,
        logs
      },
      message: `Execution \`${exec.id}\`: status **${exec.status}**, duration ${(exec.conversation_duration ?? exec.conversation_time) || 0}s, cost ${exec.total_cost || 0} cents.`
    };
  })
  .build();
