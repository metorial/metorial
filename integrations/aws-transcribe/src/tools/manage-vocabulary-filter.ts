import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';

export let manageVocabularyFilter = SlateTool.create(spec, {
  name: 'Manage Vocabulary Filter',
  key: 'manage_vocabulary_filter',
  description: `Create, update, get, delete, or list vocabulary filters. Vocabulary filters specify words to remove, mask, or tag in transcripts — commonly used for removing profanity or unwanted words. Provide filter words as a list or via an S3 file.`,
  instructions: [
    'For "create" action, provide either words or vocabularyFilterFileUri, not both.',
    'For "get" and "delete" actions, only vocabularyFilterName is required.',
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
        .describe('Action to perform on the vocabulary filter'),
      vocabularyFilterName: z
        .string()
        .optional()
        .describe('Name of the vocabulary filter (required for create/update/get/delete)'),
      languageCode: z
        .string()
        .optional()
        .describe('Language code (required for create, e.g., en-US)'),
      words: z
        .array(z.string())
        .optional()
        .describe('List of words to filter from transcripts'),
      vocabularyFilterFileUri: z
        .string()
        .optional()
        .describe('S3 URI of a text file containing filter words'),
      tags: z
        .array(
          z.object({
            key: z.string().describe('Tag key'),
            value: z.string().describe('Tag value')
          })
        )
        .optional()
        .describe('Tags for the filter (create only)'),
      nameContains: z.string().optional().describe('Filter by name (list only)'),
      maxResults: z.number().optional().describe('Max results to return (list only, 1-100)'),
      nextToken: z.string().optional().describe('Pagination token (list only)')
    })
  )
  .output(
    z.object({
      vocabularyFilterName: z.string().optional().describe('Name of the vocabulary filter'),
      languageCode: z.string().optional().describe('Language code'),
      lastModifiedTime: z.number().optional().describe('Unix timestamp of last modification'),
      downloadUri: z
        .string()
        .optional()
        .describe('S3 URI for downloading the filter (get only)'),
      deleted: z.boolean().optional().describe('Whether the filter was deleted'),
      vocabularyFilters: z
        .array(
          z.object({
            vocabularyFilterName: z.string().describe('Filter name'),
            languageCode: z.string().describe('Language code'),
            lastModifiedTime: z.number().optional().describe('Last modification time')
          })
        )
        .optional()
        .describe('List of vocabulary filters (list only)'),
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
      let result = await client.createVocabularyFilter({
        vocabularyFilterName: ctx.input.vocabularyFilterName!,
        languageCode: ctx.input.languageCode!,
        words: ctx.input.words,
        vocabularyFilterFileUri: ctx.input.vocabularyFilterFileUri,
        tags: ctx.input.tags
      });
      return {
        output: {
          vocabularyFilterName: result.VocabularyFilterName,
          languageCode: result.LanguageCode,
          lastModifiedTime: result.LastModifiedTime
        },
        message: `Created vocabulary filter **${result.VocabularyFilterName}**.`
      };
    }

    if (action === 'update') {
      let result = await client.updateVocabularyFilter({
        vocabularyFilterName: ctx.input.vocabularyFilterName!,
        words: ctx.input.words,
        vocabularyFilterFileUri: ctx.input.vocabularyFilterFileUri
      });
      return {
        output: {
          vocabularyFilterName: result.VocabularyFilterName,
          languageCode: result.LanguageCode,
          lastModifiedTime: result.LastModifiedTime
        },
        message: `Updated vocabulary filter **${result.VocabularyFilterName}**.`
      };
    }

    if (action === 'get') {
      let result = await client.getVocabularyFilter(ctx.input.vocabularyFilterName!);
      return {
        output: {
          vocabularyFilterName: result.VocabularyFilterName,
          languageCode: result.LanguageCode,
          lastModifiedTime: result.LastModifiedTime,
          downloadUri: result.DownloadUri
        },
        message: `Vocabulary filter **${result.VocabularyFilterName}** (${result.LanguageCode}).`
      };
    }

    if (action === 'delete') {
      await client.deleteVocabularyFilter(ctx.input.vocabularyFilterName!);
      return {
        output: {
          vocabularyFilterName: ctx.input.vocabularyFilterName,
          deleted: true
        },
        message: `Deleted vocabulary filter **${ctx.input.vocabularyFilterName}**.`
      };
    }

    // list
    let result = await client.listVocabularyFilters({
      nameContains: ctx.input.nameContains,
      maxResults: ctx.input.maxResults,
      nextToken: ctx.input.nextToken
    });

    let vocabularyFilters = (result.VocabularyFilters || []).map((f: any) => ({
      vocabularyFilterName: f.VocabularyFilterName,
      languageCode: f.LanguageCode,
      lastModifiedTime: f.LastModifiedTime
    }));

    return {
      output: {
        vocabularyFilters,
        nextToken: result.NextToken
      },
      message: `Found **${vocabularyFilters.length}** vocabulary filter(s).`
    };
  });
