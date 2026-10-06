import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import {
  mapTranscription,
  prepareTranscriptionFiles,
  transcriptionOutputSchema
} from '../lib/results';
import { spec } from '../spec';

export let getTranscription = SlateTool.create(spec, {
  name: 'Get Transcription',
  key: 'get_transcription',
  description: `Retrieve the status and results of a pre-recorded transcription job. Returns the full transcript, utterances with timestamps and speaker labels, and any enabled audio intelligence results (translation, summarization, sentiment, NER, chapters, etc.). Generated subtitles are available as downloadable files. Can optionally wait for completion by polling.`,
  instructions: [
    'Use a transcription ID from transcribe_audio or list_transcriptions.',
    'If the transcription is still processing, you can enable polling to wait for completion.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      transcriptionId: z.string().describe('ID of the transcription job to retrieve'),
      waitForCompletion: z
        .boolean()
        .optional()
        .describe(
          'If true, polls until the transcription is complete (up to ~5 min). Defaults to false.'
        )
    })
  )
  .output(transcriptionOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let response = ctx.input.waitForCompletion
      ? await client.pollTranscriptionUntilDone(ctx.input.transcriptionId)
      : await client.getTranscription(ctx.input.transcriptionId);
    let prepared = await prepareTranscriptionFiles(response, file => ctx.addAttachment(file));
    return {
      output: {
        ...mapTranscription({ ...response, result: prepared.result }),
        subtitleFiles: prepared.subtitleFiles
      },
      message: `Transcription ${response.id} is **${response.status}**${response.status === 'error' ? ` (error code ${response.error_code ?? 'unknown'})` : ''}.`
    };
  })
  .build();
