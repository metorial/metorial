import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { formatTranscriptSentencesAttachment, getTranscript } from './get-transcript';

describe('get_transcript schema', () => {
  it('uses an MCP-compatible top-level object schema', () => {
    let jsonSchema = z.toJSONSchema(getTranscript.inputSchema) as Record<string, unknown>;

    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema).not.toHaveProperty('oneOf');
    expect(jsonSchema).not.toHaveProperty('anyOf');
    expect(jsonSchema).not.toHaveProperty('allOf');
  });
});

describe('formatTranscriptSentencesAttachment', () => {
  let transcript = {
    title: 'Launch review',
    transcriptId: 'transcript-1',
    sentences: [
      {
        index: 0,
        text: 'Welcome everyone.',
        rawText: 'Welcome everyone.',
        startTime: 1.2,
        endTime: 4.8,
        speakerId: 1,
        speakerName: 'Jane',
        aiFilters: null
      }
    ]
  };

  it('formats text attachments with timestamps and speakers', () => {
    expect(formatTranscriptSentencesAttachment(transcript, 'text')).toContain(
      '[0:01.200 - 0:04.800] Jane: Welcome everyone.'
    );
  });

  it('formats jsonl attachments as one sentence per line', () => {
    expect(formatTranscriptSentencesAttachment(transcript, 'jsonl')).toBe(
      JSON.stringify(transcript.sentences[0])
    );
  });
});
