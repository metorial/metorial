import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElevenLabsClient } from '../lib/client';
import { spec } from '../spec';

let alignedCharacterSchema = z.object({
  text: z.string().describe('Aligned character text'),
  start: z.number().optional().describe('Start time in seconds'),
  end: z.number().optional().describe('End time in seconds')
});

let alignedWordSchema = z.object({
  text: z.string().describe('Aligned word text'),
  start: z.number().optional().describe('Start time in seconds'),
  end: z.number().optional().describe('End time in seconds'),
  loss: z.number().optional().describe('Alignment loss for this word')
});

export let createForcedAlignment = SlateTool.create(spec, {
  name: 'Create Forced Alignment',
  key: 'create_forced_alignment',
  description: `Align an audio file to a provided transcript and return character and word timing information.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      fileBase64: z.string().describe('Base64-encoded audio file to align'),
      fileName: z.string().optional().describe('Original filename for the audio'),
      text: z.string().describe('Transcript text to align with the audio')
    })
  )
  .output(
    z.object({
      characters: z.array(alignedCharacterSchema).describe('Character-level timings'),
      words: z.array(alignedWordSchema).describe('Word-level timings'),
      loss: z.number().optional().describe('Average alignment loss/confidence score')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElevenLabsClient(ctx.auth.token);
    let result = (await client.createForcedAlignment({
      fileBase64: ctx.input.fileBase64,
      fileName: ctx.input.fileName,
      text: ctx.input.text
    })) as Record<string, unknown>;

    let rawCharacters = (result.characters || []) as Record<string, unknown>[];
    let rawWords = (result.words || []) as Record<string, unknown>[];

    return {
      output: {
        characters: rawCharacters.map(character => ({
          text: String(character.text ?? ''),
          start: character.start as number | undefined,
          end: character.end as number | undefined
        })),
        words: rawWords.map(word => ({
          text: String(word.text ?? ''),
          start: word.start as number | undefined,
          end: word.end as number | undefined,
          loss: word.loss as number | undefined
        })),
        loss: result.loss as number | undefined
      },
      message: `Aligned audio to ${ctx.input.text.length} transcript character(s).`
    };
  })
  .build();
