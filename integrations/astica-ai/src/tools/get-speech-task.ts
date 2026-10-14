import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { AsticaVoiceClient } from '../lib/client';
import { getSpeechAudio, mapSpeechResult, speechOutputSchema } from '../lib/speech';
import { spec } from '../spec';

export let getSpeechTaskTool = SlateTool.create(spec, {
  name: 'Get Speech Task',
  key: 'get_speech_task',
  description:
    'Check a low-priority text_to_speech task and retrieve its downloadable WAV audio and word timestamps when ready.',
  instructions: [
    'Use the taskId returned by text_to_speech with lowPriority enabled. If pending, check again later.'
  ],
  tags: { readOnly: true }
})
  .input(
    z.object({ taskId: z.string().describe('Queued task ID returned by text_to_speech') })
  )
  .output(speechOutputSchema.omit({ audioBase64: true }).extend({ taskId: z.string() }))
  .handleInvocation(async ctx => {
    if (!ctx.input.taskId.trim()) {
      throw createApiServiceError('Provide the task ID returned by text_to_speech.');
    }
    let result = await new AsticaVoiceClient(ctx.auth.token).getSpeechTask(ctx.input.taskId);
    let speech = mapSpeechResult(result);
    let audio = getSpeechAudio(speech);
    if (audio) {
      await ctx.addAttachment({ type: 'content', content: audio, filename: 'speech.wav' });
    }
    let { audioBase64: _audioBase64, ...output } = speech;
    return {
      output: { ...output, taskId: ctx.input.taskId },
      message: audio
        ? 'Speech task completed. The WAV audio is ready to download.'
        : `Speech task status: ${speech.status}. Check again later if pending.`
    };
  })
  .build();
