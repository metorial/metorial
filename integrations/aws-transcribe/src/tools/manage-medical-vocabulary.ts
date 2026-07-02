import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';
import { requireString, tagSchema } from './common';

export let manageMedicalVocabulary = SlateTool.create(spec, {
  name: 'Manage Medical Vocabulary',
  key: 'manage_medical_vocabulary',
  description:
    'Create, update, get, delete, or list custom medical vocabularies for Amazon Transcribe Medical. Medical vocabularies use a vocabulary table file stored in S3 or an accessible URI.',
  instructions: [
    'For create and update, provide vocabularyName, languageCode, and vocabularyFileUri.',
    'Amazon Transcribe Medical currently supports en-US for medical vocabularies.',
    'For get and delete, only vocabularyName is required. For list, all parameters are optional.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get', 'delete', 'list'])
        .describe('Action to perform on the medical vocabulary'),
      vocabularyName: z
        .string()
        .optional()
        .describe('Medical vocabulary name. Required for create, update, get, and delete.'),
      languageCode: z
        .enum(['en-US'])
        .optional()
        .describe('Language code. AWS Transcribe Medical currently supports en-US.'),
      vocabularyFileUri: z
        .string()
        .optional()
        .describe('S3 or HTTPS URI of the medical vocabulary table file'),
      tags: z
        .array(tagSchema)
        .optional()
        .describe('Tags for the medical vocabulary on create'),
      stateEquals: z
        .enum(['PENDING', 'READY', 'FAILED'])
        .optional()
        .describe('Filter by vocabulary state for list'),
      nameContains: z.string().optional().describe('Filter by name for list'),
      maxResults: z.number().optional().describe('Max results to return for list (1-100)'),
      nextToken: z.string().optional().describe('Pagination token for list')
    })
  )
  .output(
    z.object({
      vocabularyName: z.string().optional().describe('Name of the medical vocabulary'),
      vocabularyState: z
        .string()
        .optional()
        .describe('State of the vocabulary (PENDING, READY, FAILED)'),
      languageCode: z.string().optional().describe('Language code'),
      lastModifiedTime: z.number().optional().describe('Unix timestamp of last modification'),
      downloadUri: z
        .string()
        .optional()
        .describe('URI for downloading the medical vocabulary table'),
      failureReason: z.string().optional().describe('Failure reason if state is FAILED'),
      deleted: z.boolean().optional().describe('Whether the medical vocabulary was deleted'),
      vocabularies: z
        .array(
          z.object({
            vocabularyName: z.string().describe('Medical vocabulary name'),
            vocabularyState: z.string().describe('Vocabulary state'),
            languageCode: z.string().describe('Language code'),
            lastModifiedTime: z.number().optional().describe('Last modification time')
          })
        )
        .optional()
        .describe('List of medical vocabularies'),
      nextToken: z.string().optional().describe('Pagination token for the next page')
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
      let vocabularyName = requireString(
        ctx.input.vocabularyName,
        'vocabularyName is required for create.'
      );
      let languageCode = requireString(
        ctx.input.languageCode,
        'languageCode is required for create.'
      );
      let vocabularyFileUri = requireString(
        ctx.input.vocabularyFileUri,
        'vocabularyFileUri is required for create.'
      );
      let result = await client.createMedicalVocabulary({
        vocabularyName,
        languageCode,
        vocabularyFileUri,
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
        message: `Created medical vocabulary **${result.VocabularyName}** with state **${result.VocabularyState}**.`
      };
    }

    if (action === 'update') {
      let vocabularyName = requireString(
        ctx.input.vocabularyName,
        'vocabularyName is required for update.'
      );
      let languageCode = requireString(
        ctx.input.languageCode,
        'languageCode is required for update.'
      );
      let vocabularyFileUri = requireString(
        ctx.input.vocabularyFileUri,
        'vocabularyFileUri is required for update.'
      );
      let result = await client.updateMedicalVocabulary({
        vocabularyName,
        languageCode,
        vocabularyFileUri
      });

      return {
        output: {
          vocabularyName: result.VocabularyName,
          vocabularyState: result.VocabularyState,
          languageCode: result.LanguageCode,
          lastModifiedTime: result.LastModifiedTime
        },
        message: `Updated medical vocabulary **${result.VocabularyName}** with state **${result.VocabularyState}**.`
      };
    }

    if (action === 'get') {
      let vocabularyName = requireString(
        ctx.input.vocabularyName,
        'vocabularyName is required for get.'
      );
      let result = await client.getMedicalVocabulary(vocabularyName);

      return {
        output: {
          vocabularyName: result.VocabularyName,
          vocabularyState: result.VocabularyState,
          languageCode: result.LanguageCode,
          lastModifiedTime: result.LastModifiedTime,
          downloadUri: result.DownloadUri,
          failureReason: result.FailureReason
        },
        message: `Medical vocabulary **${result.VocabularyName}** is in state **${result.VocabularyState}**.`
      };
    }

    if (action === 'delete') {
      let vocabularyName = requireString(
        ctx.input.vocabularyName,
        'vocabularyName is required for delete.'
      );
      await client.deleteMedicalVocabulary(vocabularyName);

      return {
        output: {
          vocabularyName,
          deleted: true
        },
        message: `Deleted medical vocabulary **${vocabularyName}**.`
      };
    }

    let result = await client.listMedicalVocabularies({
      stateEquals: ctx.input.stateEquals,
      nameContains: ctx.input.nameContains,
      maxResults: ctx.input.maxResults,
      nextToken: ctx.input.nextToken
    });
    let vocabularies = (result.Vocabularies || []).map((vocabulary: any) => ({
      vocabularyName: vocabulary.VocabularyName,
      vocabularyState: vocabulary.VocabularyState,
      languageCode: vocabulary.LanguageCode,
      lastModifiedTime: vocabulary.LastModifiedTime
    }));

    return {
      output: {
        vocabularies,
        nextToken: result.NextToken
      },
      message: `Found **${vocabularies.length}** medical vocabular${vocabularies.length === 1 ? 'y' : 'ies'}.`
    };
  });
