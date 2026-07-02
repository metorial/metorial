import { createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { FirefliesClient } from '../lib/client';
import { spec } from '../spec';
import { mapTranscriptDetail, transcriptDetailSchema } from './shared';

let sentenceModeSchema = z
  .enum(['attachment', 'inline', 'omit'])
  .optional()
  .describe(
    'How to return transcript sentences. Defaults to attachment to avoid huge inline JSON responses. Use inline only when you explicitly need sentences in structuredContent.'
  );

let sentenceFormatSchema = z
  .enum(['text', 'jsonl'])
  .optional()
  .describe(
    'Attachment format for sentences when sentenceMode is attachment. Defaults to text. Use jsonl for one JSON sentence object per line.'
  );

let formatTimestamp = (seconds: number | null) => {
  if (seconds === null || !Number.isFinite(seconds)) return '--:--';

  let milliseconds = Math.max(0, Math.round(seconds * 1000));
  let totalSeconds = Math.floor(milliseconds / 1000);
  let ms = milliseconds % 1000;
  let s = totalSeconds % 60;
  let totalMinutes = Math.floor(totalSeconds / 60);
  let m = totalMinutes % 60;
  let h = Math.floor(totalMinutes / 60);

  let base = h > 0 ? `${h}:${String(m).padStart(2, '0')}` : String(m);
  return `${base}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
};

type TranscriptOutput = ReturnType<typeof mapTranscriptDetail>;
type TranscriptSentence = NonNullable<TranscriptOutput['sentences']>[number];
type SentenceAttachmentTranscript = Pick<
  TranscriptOutput,
  'title' | 'transcriptId' | 'sentences'
>;

export let formatTranscriptSentencesAttachment = (
  transcript: SentenceAttachmentTranscript,
  format: 'text' | 'jsonl'
) => {
  let sentences = transcript.sentences ?? [];

  if (format === 'jsonl') {
    return sentences
      .map((sentence: TranscriptSentence) => JSON.stringify(sentence))
      .join('\n');
  }

  let header = [
    `Transcript: ${transcript.title ?? transcript.transcriptId}`,
    `Transcript ID: ${transcript.transcriptId}`,
    `Sentence count: ${sentences.length}`,
    ''
  ];

  let body = sentences.map((sentence: TranscriptSentence) => {
    let speaker = sentence.speakerName ?? `Speaker ${sentence.speakerId ?? 'unknown'}`;
    let text = sentence.rawText ?? sentence.text ?? '';
    return `[${formatTimestamp(sentence.startTime)} - ${formatTimestamp(sentence.endTime)}] ${speaker}: ${text}`;
  });

  return [...header, ...body].join('\n');
};

export let getTranscript = SlateTool.create(spec, {
  name: 'Get Transcript',
  key: 'get_transcript',
  description: `Retrieve the full details of a specific meeting transcript including AI-generated summary, analytics, calendar metadata, channels, sharing metadata, attendee information, and meeting processing status. By default, full sentences are returned as a Slate attachment so large transcripts are exposed as a URL in MCP instead of huge inline JSON.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      transcriptId: z.string().describe('The unique identifier of the transcript to retrieve'),
      sentenceMode: sentenceModeSchema,
      sentenceFormat: sentenceFormatSchema
    })
  )
  .output(transcriptDetailSchema)
  .handleInvocation(async ctx => {
    let client = new FirefliesClient({ token: ctx.auth.token });
    let transcript = await client.getTranscript(ctx.input.transcriptId);
    let output = mapTranscriptDetail(transcript);

    let sentenceCount = output.sentences?.length ?? 0;
    let sentenceMode = ctx.input.sentenceMode ?? 'attachment';
    let sentenceFormat = ctx.input.sentenceFormat ?? 'text';
    let attachments =
      sentenceMode === 'attachment' && sentenceCount > 0
        ? [
            createTextAttachment(
              formatTranscriptSentencesAttachment(output, sentenceFormat),
              sentenceFormat === 'jsonl' ? 'application/x-ndjson' : 'text/plain'
            )
          ]
        : [];
    let responseOutput = {
      ...output,
      sentences: sentenceMode === 'inline' ? output.sentences : null,
      sentenceMode,
      sentenceFormat: sentenceMode === 'attachment' ? sentenceFormat : null,
      sentenceCount,
      attachmentCount: attachments.length
    };

    let sentenceDelivery =
      sentenceMode === 'attachment' && attachments.length > 0
        ? ` Full sentences returned as a ${sentenceFormat} attachment.`
        : sentenceMode === 'inline'
          ? ' Full sentences returned inline.'
          : ' Full sentences omitted.';

    return {
      output: responseOutput,
      attachments,
      message: `Retrieved transcript **"${output.title}"** with ${sentenceCount} sentences and ${output.speakers?.length ?? 0} speakers.${sentenceDelivery}`
    };
  })
  .build();
