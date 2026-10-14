import { z } from 'zod';
import type { CallNote } from './client';

export let callNoteSchema = z.object({
  noteUuid: z.string().describe('UUID of the call note'),
  callUuid: z.string().optional().describe('UUID of the associated call'),
  callLeexiUrl: z.string().optional().describe('URL of the associated call in Leexi'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  updatedAt: z.string().optional().describe('ISO 8601 last updated timestamp'),
  prompt: z
    .object({
      promptUuid: z.string().describe('UUID of the prompt'),
      title: z.string().optional().describe('Prompt title'),
      category: z.string().optional().describe('Prompt category, such as summary')
    })
    .optional(),
  translations: z
    .array(
      z.object({
        translationUuid: z.string().describe('UUID of the translation'),
        locale: z.string().describe('Translation locale, such as en-US'),
        text: z.string().describe('Current translated note text'),
        originalText: z.string().optional().describe('Original note text'),
        updatedAt: z.string().optional().describe('ISO 8601 last updated timestamp')
      })
    )
    .optional()
});

export let mapCallNote = (note: CallNote) => ({
  noteUuid: note.uuid,
  callUuid: note.call?.uuid,
  callLeexiUrl: note.call?.leexi_url,
  createdAt: note.created_at,
  updatedAt: note.updated_at,
  prompt: note.prompt
    ? {
        promptUuid: note.prompt.uuid,
        title: note.prompt.title,
        category: note.prompt.category
      }
    : undefined,
  translations: note.translations?.map(translation => ({
    translationUuid: translation.uuid,
    locale: translation.locale,
    text: translation.text,
    originalText: translation.original_text,
    updatedAt: translation.updated_at
  }))
});
