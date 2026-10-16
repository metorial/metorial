import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { projectIdSchema, rawSchema } from '../lib/schemas';
import { spec } from '../spec';

export let manageTranslationsTool = SlateTool.create(spec, {
  name: 'Manage Translations',
  tags: { destructive: true },
  key: 'manage_translations',
  description: `Add string-level translations, upload file translations, apply pre-translation, or list translations for a specific string. Use this for managing translation content directly.`,
  instructions: [
    'For uploading file translations, provide the translation file content as a string. It will be uploaded to Storage first.',
    'Pre-translation applies TM, MT, or AI translations to untranslated strings.'
  ]
})
  .input(
    z.object({
      projectId: projectIdSchema,
      action: z
        .enum([
          'add_string_translation',
          'upload_file_translation',
          'pre_translate',
          'list_string_translations',
          'pre_translation_status',
          'delete_string_translation'
        ])
        .describe('Action to perform'),
      preTranslationId: z
        .string()
        .optional()
        .describe('Job identifier returned by pre_translate'),
      translationId: z
        .number()
        .optional()
        .describe(
          'Translation ID from list_string_translations, required for delete_string_translation'
        ),
      aiPromptId: z
        .number()
        .optional()
        .describe('AI prompt ID required when pre-translation method is ai'),
      pluralCategoryName: z
        .enum(['zero', 'one', 'two', 'few', 'many', 'other'])
        .optional()
        .describe('Plural form for add_string_translation'),
      stringId: z
        .number()
        .optional()
        .describe('String ID (for add_string_translation/list_string_translations)'),
      languageId: z.string().optional().describe('Target language code'),
      text: z.string().optional().describe('Translation text (for add_string_translation)'),
      fileId: z.number().optional().describe('File ID (for upload_file_translation)'),
      fileContent: z
        .string()
        .optional()
        .describe('Translation file content (for upload_file_translation)'),
      fileName: z
        .string()
        .optional()
        .describe('Translation file name (for upload_file_translation)'),
      autoApproveImported: z
        .boolean()
        .optional()
        .describe('Auto-approve imported translations'),
      languageIds: z
        .array(z.string())
        .optional()
        .describe('Target language IDs (for pre_translate)'),
      fileIds: z.array(z.number()).optional().describe('File IDs (for pre_translate)'),
      method: z.enum(['tm', 'mt', 'ai']).optional().describe('Pre-translation method'),
      engineId: z
        .number()
        .optional()
        .describe('MT engine ID (for pre_translate with mt method)'),
      limit: z.number().optional().describe('Limit (for list)'),
      offset: z.number().optional().describe('Offset (for list)')
    })
  )
  .output(
    z.object({
      raw: rawSchema,
      translationId: z
        .number()
        .optional()
        .describe(
          'Translation ID; upload_file_translation retains the source file ID for compatibility'
        ),
      fileId: z.number().optional(),
      deleted: z.boolean().optional(),
      progress: z.number().optional(),
      pagination: z.object({ offset: z.number(), limit: z.number() }).optional(),
      text: z.string().optional().describe('Translation text'),
      preTranslationId: z.string().optional().describe('Pre-translation job ID'),
      preTranslationStatus: z.string().optional().describe('Pre-translation status'),
      translations: z
        .array(
          z.object({
            translationId: z.number(),
            text: z.string(),
            languageId: z.string(),
            userId: z.number().optional(),
            createdAt: z.string().optional()
          })
        )
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { projectId, action } = ctx.input;

    if (action === 'add_string_translation') {
      if (!ctx.input.stringId || !ctx.input.languageId || !ctx.input.text) {
        throw createApiServiceError('stringId, languageId, and text are required');
      }

      let translation = await client.addTranslation(projectId, {
        stringId: ctx.input.stringId,
        languageId: ctx.input.languageId,
        text: ctx.input.text,
        pluralCategoryName: ctx.input.pluralCategoryName
      });

      return {
        output: {
          raw: client.lastResponse,
          translationId: translation.id,
          text: translation.text
        },
        message: `Added translation (ID: ${translation.id}) for string ${ctx.input.stringId} in **${ctx.input.languageId}**.`
      };
    }

    if (action === 'upload_file_translation') {
      if (!ctx.input.languageId || !ctx.input.fileId || ctx.input.fileContent === undefined) {
        throw createApiServiceError('languageId, fileId, and fileContent are required');
      }

      let fileName =
        ctx.input.fileName ?? (await client.getFile(projectId, ctx.input.fileId)).name;
      let storage = await client.addStorage(fileName, ctx.input.fileContent);
      let result = await client.uploadTranslation(projectId, ctx.input.languageId, {
        storageId: storage.id,
        fileId: ctx.input.fileId,
        autoApproveImported: ctx.input.autoApproveImported
      });

      return {
        output: {
          raw: client.lastResponse,
          translationId: result.fileId ?? result.id,
          fileId: result.fileId
        },
        message: `Uploaded translation file for file ${ctx.input.fileId} in **${ctx.input.languageId}**.`
      };
    }

    if (action === 'pre_translate') {
      if (!ctx.input.languageIds || !ctx.input.fileIds) {
        throw createApiServiceError('languageIds and fileIds are required');
      }

      if (!ctx.input.languageIds.length || !ctx.input.fileIds.length)
        throw createApiServiceError('languageIds and fileIds must not be empty.');
      if (ctx.input.method === 'mt' && ctx.input.engineId === undefined)
        throw createApiServiceError('engineId is required when method is mt.');
      if (ctx.input.method === 'ai' && ctx.input.aiPromptId === undefined)
        throw createApiServiceError('aiPromptId is required when method is ai.');
      let result = await client.applyPreTranslation(projectId, {
        languageIds: ctx.input.languageIds,
        fileIds: ctx.input.fileIds,
        method: ctx.input.method,
        engineId: ctx.input.engineId,
        aiPromptId: ctx.input.aiPromptId
      });

      return {
        output: {
          raw: client.lastResponse,
          preTranslationId: result.identifier,
          preTranslationStatus: result.status
        },
        message: `Started pre-translation job (status: ${result.status}).`
      };
    }

    if (action === 'list_string_translations') {
      if (!ctx.input.stringId || !ctx.input.languageId) {
        throw createApiServiceError('stringId and languageId are required');
      }

      let result = await client.listStringTranslations(projectId, {
        stringId: ctx.input.stringId,
        languageId: ctx.input.languageId,
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });

      let translations = result.data.map((item: any) => ({
        translationId: item.data.id,
        text: item.data.text,
        languageId: item.data.languageId || ctx.input.languageId!,
        userId: item.data.user?.id ?? undefined,
        createdAt: item.data.createdAt
      }));

      return {
        output: { raw: client.lastResponse, translations, pagination: result.pagination },
        message: `Found **${translations.length}** translations for string ${ctx.input.stringId} in ${ctx.input.languageId}.`
      };
    }

    if (action === 'pre_translation_status') {
      if (!ctx.input.preTranslationId)
        throw createApiServiceError('preTranslationId is required.');
      const result = await client.getPreTranslationStatus(
        projectId,
        ctx.input.preTranslationId
      );
      return {
        output: {
          raw: client.lastResponse,
          preTranslationId: result.identifier,
          preTranslationStatus: result.status,
          progress: result.progress
        },
        message: `Pre-translation status: ${result.status}.`
      };
    }
    if (action === 'delete_string_translation') {
      if (!ctx.input.translationId) throw createApiServiceError('translationId is required.');
      await client.deleteTranslation(projectId, ctx.input.translationId);
      return {
        output: {
          raw: client.lastResponse,
          translationId: ctx.input.translationId,
          deleted: true
        },
        message: 'Deleted the translation.'
      };
    }
    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
