import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getExecution = SlateTool.create(spec, {
  name: 'Get Execution',
  key: 'get_execution',
  description: `Retrieve details of a specific call execution including transcript, recording URL, cost breakdown, telephony metadata, and extracted data.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      executionId: z.string().describe('Execution ID of the call'),
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
        createdAt: l.created_at,
        type: l.type,
        component: l.component,
        provider: l.provider,
        logData: l.data
      }));
    }

    return {
      output: {
        executionId: exec.id,
        agentId: exec.agent_id,
        batchId: exec.batch_id,
        status: exec.status,
        transcript: exec.transcript,
        conversationTime: exec.conversation_time,
        totalCost: exec.total_cost,
        answeredByVoiceMail: exec.answered_by_voice_mail,
        errorMessage: exec.error_message,
        createdAt: exec.created_at,
        updatedAt: exec.updated_at,
        extractedData: exec.extracted_data,
        contextDetails: exec.context_details,
        costBreakdown: exec.cost_breakdown
          ? {
              llm: exec.cost_breakdown.llm,
              network: exec.cost_breakdown.network,
              platform: exec.cost_breakdown.platform,
              synthesizer: exec.cost_breakdown.synthesizer,
              transcriber: exec.cost_breakdown.transcriber
            }
          : undefined,
        telephonyData: exec.telephony_data
          ? {
              duration: exec.telephony_data.duration,
              toNumber: exec.telephony_data.to_number,
              fromNumber: exec.telephony_data.from_number,
              recordingUrl: exec.telephony_data.recording_url,
              callType: exec.telephony_data.call_type,
              telephonyProvider: exec.telephony_data.provider,
              hangupBy: exec.telephony_data.hangup_by,
              hangupReason: exec.telephony_data.hangup_reason
            }
          : undefined,
        logs
      },
      message: `Execution \`${exec.id}\`: status **${exec.status}**, duration ${exec.conversation_time || 0}s, cost ${exec.total_cost || 0} cents.`
    };
  })
  .build();
