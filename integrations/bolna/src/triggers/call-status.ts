import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let callStatus = SlateTrigger.create(spec, {
  name: 'Call Status',
  key: 'call_status',
  description:
    'Triggers when a call status changes. Receives real-time updates for all call lifecycle events including queued, ringing, in-progress, completed, failed, and more.'
})
  .input(
    z.object({
      executionId: z.string().describe('Execution ID of the call'),
      status: z.string().describe('Call status'),
      agentId: z.string().optional().describe('Agent ID'),
      batchId: z.string().optional().describe('Batch ID if part of a batch'),
      transcript: z.string().optional().describe('Conversation transcript'),
      conversationTime: z.number().optional().describe('Conversation duration in seconds'),
      totalCost: z.number().optional().describe('Total cost in cents'),
      answeredByVoiceMail: z.boolean().optional().describe('Whether voicemail answered'),
      errorMessage: z.string().optional().describe('Error message if call failed'),
      extractedData: z
        .any()
        .optional()
        .describe('Structured data extracted from conversation'),
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
        .describe('Cost breakdown by component'),
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
        .describe('Telephony metadata'),
      transferCallData: z
        .object({
          status: z.string().optional(),
          duration: z.string().optional(),
          cost: z.number().optional(),
          toNumber: z.string().optional(),
          fromNumber: z.string().optional(),
          recordingUrl: z.string().optional()
        })
        .optional()
        .describe('Transfer call data if call was transferred'),
      batchRunDetails: z
        .object({
          status: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          retried: z.number().optional()
        })
        .optional()
        .describe('Batch run details')
    })
  )
  .output(
    z.object({
      executionId: z.string().describe('Execution ID'),
      status: z.string().describe('Call status'),
      agentId: z.string().optional().describe('Agent ID'),
      batchId: z.string().optional().describe('Batch ID'),
      transcript: z.string().optional().describe('Conversation transcript'),
      conversationTime: z.number().optional().describe('Conversation duration in seconds'),
      totalCost: z.number().optional().describe('Total cost in cents'),
      answeredByVoiceMail: z.boolean().optional().describe('Whether voicemail answered'),
      errorMessage: z.string().optional().describe('Error message'),
      extractedData: z.any().optional().describe('Extracted structured data'),
      contextDetails: z.any().optional().describe('Call context variables'),
      costBreakdown: z
        .object({
          llm: z.number().optional(),
          network: z.number().optional(),
          platform: z.number().optional(),
          synthesizer: z.number().optional(),
          transcriber: z.number().optional()
        })
        .optional()
        .describe('Cost breakdown'),
      toNumber: z.string().optional().describe('Recipient phone number'),
      fromNumber: z.string().optional().describe('Caller phone number'),
      recordingUrl: z.string().optional().describe('Call recording URL'),
      callType: z.string().optional().describe('Call type (inbound/outbound)'),
      telephonyProvider: z.string().optional().describe('Telephony provider used'),
      hangupBy: z.string().optional().describe('Who hung up the call'),
      hangupReason: z.string().optional().describe('Reason for hangup'),
      callDuration: z.string().optional().describe('Total call duration'),
      transferCallData: z
        .object({
          status: z.string().optional(),
          duration: z.string().optional(),
          cost: z.number().optional(),
          toNumber: z.string().optional(),
          fromNumber: z.string().optional(),
          recordingUrl: z.string().optional()
        })
        .optional()
        .describe('Transfer call data'),
      batchRunDetails: z
        .object({
          status: z.string().optional(),
          createdAt: z.string().optional(),
          updatedAt: z.string().optional(),
          retried: z.number().optional()
        })
        .optional()
        .describe('Batch run details')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      // The webhook payload matches the execution data structure
      let input: any = {
        executionId: data.id || data.execution_id,
        status: data.status,
        agentId: data.agent_id,
        batchId: data.batch_id,
        transcript: data.transcript,
        conversationTime: data.conversation_time,
        totalCost: data.total_cost,
        answeredByVoiceMail: data.answered_by_voice_mail,
        errorMessage: data.error_message,
        extractedData: data.extracted_data,
        contextDetails: data.context_details
      };

      if (data.cost_breakdown) {
        input.costBreakdown = {
          llm: data.cost_breakdown.llm,
          network: data.cost_breakdown.network,
          platform: data.cost_breakdown.platform,
          synthesizer: data.cost_breakdown.synthesizer,
          transcriber: data.cost_breakdown.transcriber
        };
      }

      if (data.telephony_data) {
        input.telephonyData = {
          duration: data.telephony_data.duration,
          toNumber: data.telephony_data.to_number,
          fromNumber: data.telephony_data.from_number,
          recordingUrl: data.telephony_data.recording_url,
          callType: data.telephony_data.call_type,
          telephonyProvider: data.telephony_data.provider,
          hangupBy: data.telephony_data.hangup_by,
          hangupReason: data.telephony_data.hangup_reason
        };
      }

      if (data.transfer_call_data) {
        input.transferCallData = {
          status: data.transfer_call_data.status,
          duration: data.transfer_call_data.duration,
          cost: data.transfer_call_data.cost,
          toNumber: data.transfer_call_data.to_number,
          fromNumber: data.transfer_call_data.from_number,
          recordingUrl: data.transfer_call_data.recording_url
        };
      }

      if (data.batch_run_details) {
        input.batchRunDetails = {
          status: data.batch_run_details.status,
          createdAt: data.batch_run_details.created_at,
          updatedAt: data.batch_run_details.updated_at,
          retried: data.batch_run_details.retried
        };
      }

      return {
        inputs: [input]
      };
    },

    handleEvent: async ctx => {
      let input = ctx.input;

      return {
        type: `call.${input.status}`,
        id: `${input.executionId}-${input.status}`,
        output: {
          executionId: input.executionId,
          status: input.status,
          agentId: input.agentId,
          batchId: input.batchId,
          transcript: input.transcript,
          conversationTime: input.conversationTime,
          totalCost: input.totalCost,
          answeredByVoiceMail: input.answeredByVoiceMail,
          errorMessage: input.errorMessage,
          extractedData: input.extractedData,
          contextDetails: input.contextDetails,
          costBreakdown: input.costBreakdown,
          toNumber: input.telephonyData?.toNumber,
          fromNumber: input.telephonyData?.fromNumber,
          recordingUrl: input.telephonyData?.recordingUrl,
          callType: input.telephonyData?.callType,
          telephonyProvider: input.telephonyData?.telephonyProvider,
          hangupBy: input.telephonyData?.hangupBy,
          hangupReason: input.telephonyData?.hangupReason,
          callDuration: input.telephonyData?.duration,
          transferCallData: input.transferCallData,
          batchRunDetails: input.batchRunDetails
        }
      };
    }
  })
  .build();
