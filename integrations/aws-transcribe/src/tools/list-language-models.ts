import { SlateTool } from 'slates';
import { z } from 'zod';
import { TranscribeClient } from '../lib/client';
import { spec } from '../spec';

export let listLanguageModels = SlateTool.create(spec, {
  name: 'List Language Models',
  key: 'list_language_models',
  description: `List custom language models in your AWS account. Filter by status or name to find specific models. Custom language models improve transcription accuracy for specific domains by training on your text data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      statusEquals: z
        .enum(['IN_PROGRESS', 'FAILED', 'COMPLETED'])
        .optional()
        .describe('Filter by model training status'),
      nameContains: z
        .string()
        .optional()
        .describe('Filter models whose name contains this string'),
      maxResults: z.number().optional().describe('Maximum number of results (1-100)'),
      nextToken: z.string().optional().describe('Pagination token from a previous response')
    })
  )
  .output(
    z.object({
      models: z
        .array(
          z.object({
            modelName: z.string().describe('Name of the language model'),
            modelStatus: z.string().optional().describe('Training status'),
            languageCode: z.string().optional().describe('Language code'),
            baseModelName: z.string().optional().describe('Base model used'),
            createTime: z.number().optional().describe('Creation timestamp'),
            lastModifiedTime: z.number().optional().describe('Last modification timestamp')
          })
        )
        .describe('List of custom language models'),
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

    let result = await client.listLanguageModels(ctx.input);
    let models = (result.Models || []).map((m: any) => ({
      modelName: m.ModelName,
      modelStatus: m.ModelStatus,
      languageCode: m.LanguageCode,
      baseModelName: m.BaseModelName,
      createTime: m.CreateTime,
      lastModifiedTime: m.LastModifiedTime
    }));

    return {
      output: {
        models,
        nextToken: result.NextToken
      },
      message: `Found **${models.length}** custom language model(s).`
    };
  });
