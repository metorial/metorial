import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, getCallDuration } from '../lib/client';
import { spec } from '../spec';

export let getCallTranscript = SlateTool.create(spec, {
  name: 'Get Call Transcript',
  key: 'get_call_transcript',
  description: `Retrieve the full transcript, recording URL, analysis summary, and conversation messages for a specific call. Use this to access post-call artifacts after a call has ended.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      callId: z.string().describe('ID of the call to retrieve transcript for')
    })
  )
  .output(
    z.object({
      callId: z.string().describe('ID of the call'),
      status: z.string().optional().describe('Call status'),
      transcript: z.string().optional().describe('Full call transcript text'),
      recordingUrl: z.string().optional().describe('URL to the call audio recording'),
      stereoRecordingUrl: z.string().optional().describe('URL to stereo recording'),
      videoRecordingUrl: z.string().optional().describe('URL to video recording'),
      summary: z.string().optional().describe('AI-generated call summary'),
      structuredData: z.any().optional().describe('Structured data extracted from the call'),
      successEvaluation: z.string().optional().describe('Success evaluation result'),
      messages: z
        .array(
          z.object({
            role: z
              .string()
              .optional()
              .describe('Message role (user, assistant, system, tool_call, tool_result)'),
            content: z.string().optional().describe('Message content'),
            time: z.number().optional().describe('Provider message timestamp'),
            endTime: z.number().optional().describe('Provider message end timestamp'),
            secondsFromStart: z
              .number()
              .optional()
              .describe('Seconds from the start of the conversation'),
            duration: z.number().optional().describe('Duration in seconds'),
            toolCalls: z.array(z.unknown()).optional().describe('Invoked tool definitions'),
            toolCallId: z.string().optional().describe('ID linking a tool result to its call'),
            name: z.string().optional().describe('Name of the tool that returned the result'),
            result: z.unknown().optional().describe('Result returned by the invoked tool')
          })
        )
        .optional()
        .describe('Conversation messages with timestamps'),
      duration: z.number().optional().describe('Total call duration in seconds'),
      endedReason: z.string().optional().describe('Reason the call ended')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token, ctx.auth.region);
    let call = await client.getCall(ctx.input.callId);

    let messages = (call.artifact?.messages ?? call.messages ?? []).map((m: any) => ({
      role: m.role,
      content: m.message ?? m.content,
      time: m.time,
      endTime: m.endTime,
      secondsFromStart: m.secondsFromStart,
      duration: m.duration,
      toolCalls: m.toolCalls,
      toolCallId: m.toolCallId,
      name: m.name,
      result: m.result
    }));

    return {
      output: {
        callId: call.id,
        status: call.status,
        transcript: call.artifact?.transcript,
        recordingUrl:
          call.artifact?.recording?.mono?.combinedUrl ?? call.artifact?.recordingUrl,
        stereoRecordingUrl:
          call.artifact?.recording?.stereoUrl ?? call.artifact?.stereoRecordingUrl,
        videoRecordingUrl:
          call.artifact?.recording?.videoUrl ?? call.artifact?.videoRecordingUrl,
        summary: call.analysis?.summary,
        structuredData: call.analysis?.structuredData,
        successEvaluation: call.analysis?.successEvaluation,
        messages,
        duration: getCallDuration(call),
        endedReason: call.endedReason
      },
      message: `Retrieved transcript for call **${call.id}** (${call.status}). ${messages.length} message(s), duration: ${getCallDuration(call) !== undefined ? `${getCallDuration(call)}s` : 'N/A'}.`
    };
  })
  .build();
