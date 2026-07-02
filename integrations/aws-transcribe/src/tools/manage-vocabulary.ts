import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';

export let manageVocabulary = SlateTool.create(spec, {
  name: 'Manage Vocabulary',
  key: 'manage_vocabulary',
  description: `Create, update, get, delete, or list custom vocabularies. Custom vocabularies improve transcription accuracy for domain-specific words like product names, technical terms, or proper nouns. Provide terms as a list of phrases or via an S3 file.`,
  instructions: [
    'For "create" and "update" actions, provide either phrases or vocabularyFileUri, not both.',
    'For "get" and "delete" actions, only vocabularyName is required.',
    'For "list" action, all parameters are optional filters.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'delete', 'list'])
        .describe('Action to perform on the vocabulary'),
      vocabularyName: z
        .string()
        .optional()
        .describe('Name of the vocabulary (required for create/update/get/delete)'),
      languageCode: z
        .string()
        .optional()
        .describe('Language code (required for create/update, e.g., en-US)'),
      phrases: z
        .array(z.string())
        .optional()
        .describe('List of words and phrases to include in the vocabulary'),
      vocabularyFileUri: z
        .string()
        .optional()
        .describe('S3 URI of a text file containing vocabulary terms'),
      tags: z
        .array(
          z.object({
            key: z.string().describe('Tag key'),
            value: z.string().describe('Tag value')
          })
        )
        .optional()
        .describe('Tags for the vocabulary (create only)'),
      stateEquals: z
        .enum(['PENDING', 'READY', 'FAILED'])
        .optional()
        .describe('Filter by state (list only)'),
      nameContains: z.string().optional().describe('Filter by name (list only)'),
      maxResults: z.number().optional().describe('Max results to return (list only, 1-100)'),
      nextToken: z.string().optional().describe('Pagination token (list only)')
    })
  )
  .output(
    z.object({
      vocabularyName: z.string().optional().describe('Name of the vocabulary'),
      vocabularyState: z
        .string()
        .optional()
        .describe('State of the vocabulary (PENDING, READY, FAILED)'),
      languageCode: z.string().optional().describe('Language code'),
      lastModifiedTime: z.number().optional().describe('Unix timestamp of last modification'),
      downloadUri: z
        .string()
        .optional()
        .describe('S3 URI for downloading the vocabulary (get only)'),
      failureReason: z.string().optional().describe('Failure reason if state is FAILED'),
      deleted: z.boolean().optional().describe('Whether the vocabulary was deleted'),
      vocabularies: z
        .array(
          z.object({
            vocabularyName: z.string().describe('Vocabulary name'),
            vocabularyState: z.string().describe('Vocabulary state'),
            languageCode: z.string().describe('Language code'),
            lastModifiedTime: z.number().optional().describe('Last modification time')
          })
        )
        .optional()
        .describe('List of vocabularies (list only)'),
      nextToken: z.string().optional().describe('Pagination token for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TranscribeClient({
      credentials: {
        accessKeyId: ctx.auth.accessKeyId,
        secretAccessKey: ctx.auth.secretAccessKey,
        sessionToken: ctx.auth.sessionToken
      },
      region: ctx.config.region
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let result = await client.createVocabulary({
        vocabularyName: ctx.input.vocabularyName!,
        languageCode: ctx.input.languageCode!,
        phrases: ctx.input.phrases,
        vocabularyFileUri: ctx.input.vocabularyFileUri,
        tags: ctx.input.tags
      });
      return {
        output: {
          vocabularyName: result.VocabularyName,
          vocabularyState: result.VocabularyState,
          languageCode: result.LanguageCode,
          lastModifiedTime: result.LastModifiedTime,
          failureReason: result.FailureReason
        },
        message: `Created vocabulary **${result.VocabularyName}** with state **${result.VocabularyState}**.`
      };
    }

    if (action === 'update') {
      let result = await client.updateVocabulary({
        vocabularyName: ctx.input.vocabularyName!,
        languageCode: ctx.input.languageCode!,
        phrases: ctx.input.phrases,
        vocabularyFileUri: ctx.input.vocabularyFileUri
      });
      return {
        output: {
          vocabularyName: result.VocabularyName,
          vocabularyState: result.VocabularyState,
          languageCode: result.LanguageCode,
          lastModifiedTime: result.LastModifiedTime
        },
        message: `Updated vocabulary **${result.VocabularyName}** — state is **${result.VocabularyState}**.`
      };
    }

    if (action === 'get') {
      let result = await client.getVocabulary(ctx.input.vocabularyName!);
      return {
        output: {
          vocabularyName: result.VocabularyName,
          vocabularyState: result.VocabularyState,
          languageCode: result.LanguageCode,
          lastModifiedTime: result.LastModifiedTime,
          downloadUri: result.DownloadUri,
          failureReason: result.FailureReason
        },
        message: `Vocabulary **${result.VocabularyName}** is in state **${result.VocabularyState}**.`
      };
    }

    if (action === 'delete') {
      await client.deleteVocabulary(ctx.input.vocabularyName!);
      return {
        output: {
          vocabularyName: ctx.input.vocabularyName,
          deleted: true
        },
        message: `Deleted vocabulary **${ctx.input.vocabularyName}**.`
      };
    }

    // list
    let result = await client.listVocabularies({
      stateEquals: ctx.input.stateEquals,
      nameContains: ctx.input.nameContains,
      maxResults: ctx.input.maxResults,
      nextToken: ctx.input.nextToken
    });

    let vocabularies = (result.Vocabularies || []).map((v: any) => ({
      vocabularyName: v.VocabularyName,
      vocabularyState: v.VocabularyState,
      languageCode: v.LanguageCode,
      lastModifiedTime: v.LastModifiedTime
    }));

    return {
      output: {
        vocabularies,
        nextToken: result.NextToken
      },
      message: `Found **${vocabularies.length}** vocabular${vocabularies.length === 1 ? 'y' : 'ies'}.`
    };
  });
