import { SlateTool } from 'slates';
import { z } from 'zod';
import { RevAIClient } from '../lib/client';
import { spec } from '../spec';

export let manageCustomVocabulary = SlateTool.create(spec, {
  name: 'Manage Custom Vocabulary',
  key: 'manage_custom_vocabulary',
  description: `Creates, retrieves, lists, or deletes custom vocabularies. Custom vocabularies improve transcription accuracy for domain-specific terms not in the standard dictionary. Once created and compiled, a vocabulary can be referenced by ID in transcription jobs.`,
  instructions: [
    'Use action "create" with phrases to submit a new custom vocabulary for compilation.',
    'Use action "get" with vocabularyId to check the status of a vocabulary.',
    'Use action "list" to see all custom vocabularies.',
    'Use action "delete" with vocabularyId to permanently remove a vocabulary.'
  ],
  constraints: [
    'Up to 6,000 phrases per job for English, up to 1,000 for other languages.',
    'Vocabulary must reach "complete" status before it can be used in transcription jobs.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'list', 'delete'])
        .describe('Action to perform on custom vocabularies'),
      phrases: z
        .array(z.string())
        .optional()
        .describe('List of custom words/phrases to compile (for "create" action)'),
      vocabularyId: z
        .string()
        .optional()
        .describe('Vocabulary ID (for "get" and "delete" actions)'),
      metadata: z
        .string()
        .optional()
        .describe('Optional metadata to associate with the vocabulary (for "create" action)'),
      limit: z
        .number()
        .optional()
        .describe('Maximum number of vocabularies to return (for "list" action)')
    })
  )
  .output(
    z.object({
      vocabulary: z
        .object({
          vocabularyId: z.string().describe('Unique vocabulary identifier'),
          status: z
            .string()
            .describe('Vocabulary status: "in_progress", "complete", "failed"'),
          createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
          completedOn: z.string().optional().describe('ISO 8601 completion timestamp'),
          metadata: z.string().optional().describe('Associated metadata'),
          failure: z.string().optional().describe('Failure reason if compilation failed')
        })
        .optional()
        .describe('Single vocabulary details (for "create", "get", "delete" actions)'),
      vocabularies: z
        .array(
          z.object({
            vocabularyId: z.string().describe('Unique vocabulary identifier'),
            status: z.string().describe('Vocabulary status'),
            createdOn: z.string().optional().describe('ISO 8601 creation timestamp'),
            metadata: z.string().optional().describe('Associated metadata')
          })
        )
        .optional()
        .describe('List of vocabularies (for "list" action)'),
      deleted: z
        .boolean()
        .optional()
        .describe('Whether vocabulary was deleted (for "delete" action)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RevAIClient({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.phrases?.length) {
          throw new Error('phrases are required for the "create" action');
        }
        let vocab = await client.submitCustomVocabulary({
          customVocabularies: [{ phrases: ctx.input.phrases }],
          metadata: ctx.input.metadata
        });
        return {
          output: {
            vocabulary: {
              vocabularyId: vocab.vocabularyId,
              status: vocab.status,
              createdOn: vocab.createdOn,
              completedOn: vocab.completedOn,
              metadata: vocab.metadata,
              failure: vocab.failure
            }
          },
          message: `Custom vocabulary **${vocab.vocabularyId}** created with **${ctx.input.phrases.length}** phrase(s). Status: **${vocab.status}**.`
        };
      }

      case 'get': {
        if (!ctx.input.vocabularyId) {
          throw new Error('vocabularyId is required for the "get" action');
        }
        let vocab = await client.getCustomVocabulary(ctx.input.vocabularyId);
        return {
          output: {
            vocabulary: {
              vocabularyId: vocab.vocabularyId,
              status: vocab.status,
              createdOn: vocab.createdOn,
              completedOn: vocab.completedOn,
              metadata: vocab.metadata,
              failure: vocab.failure
            }
          },
          message: `Custom vocabulary **${vocab.vocabularyId}** is **${vocab.status}**.`
        };
      }

      case 'list': {
        let vocabs = await client.listCustomVocabularies({ limit: ctx.input.limit });
        return {
          output: {
            vocabularies: vocabs.map(v => ({
              vocabularyId: v.vocabularyId,
              status: v.status,
              createdOn: v.createdOn,
              metadata: v.metadata
            }))
          },
          message: `Found **${vocabs.length}** custom vocabular${vocabs.length === 1 ? 'y' : 'ies'}.`
        };
      }

      case 'delete': {
        if (!ctx.input.vocabularyId) {
          throw new Error('vocabularyId is required for the "delete" action');
        }
        await client.deleteCustomVocabulary(ctx.input.vocabularyId);
        return {
          output: { deleted: true },
          message: `Custom vocabulary **${ctx.input.vocabularyId}** deleted.`
        };
      }
    }
  })
  .build();
