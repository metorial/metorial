import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let translationStatusTool = SlateTool.create(spec, {
  name: 'Translation Status',
  key: 'translation_status',
  description: `Get translation and approval progress for a project, file, branch, or specific language. Returns word/phrase counts and percentage completion per language.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.number().describe('The project ID'),
      scope: z
        .enum(['project', 'file', 'branch', 'language'])
        .default('project')
        .describe('Scope of the progress query'),
      fileId: z.number().optional().describe('File ID (required when scope is "file")'),
      branchId: z.number().optional().describe('Branch ID (required when scope is "branch")'),
      languageId: z
        .string()
        .optional()
        .describe('Language code (required when scope is "language")'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Number of results to skip')
    })
  )
  .output(
    z.object({
      progress: z.array(
        z.object({
          languageId: z.string().optional().describe('Language code'),
          fileId: z.number().optional().describe('File ID (when scope is "language")'),
          words: z.object({
            total: z.number(),
            translated: z.number(),
            approved: z.number()
          }),
          phrases: z.object({
            total: z.number(),
            translated: z.number(),
            approved: z.number()
          }),
          translationProgress: z.number().describe('Translation progress percentage'),
          approvalProgress: z.number().describe('Approval progress percentage')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { projectId, scope } = ctx.input;
    let result: any;

    if (scope === 'file') {
      if (!ctx.input.fileId) throw new Error('fileId is required for file scope');
      result = await client.getFileProgress(projectId, ctx.input.fileId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
    } else if (scope === 'branch') {
      if (!ctx.input.branchId) throw new Error('branchId is required for branch scope');
      result = await client.getBranchProgress(projectId, ctx.input.branchId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
    } else if (scope === 'language') {
      if (!ctx.input.languageId) throw new Error('languageId is required for language scope');
      result = await client.getLanguageProgress(projectId, ctx.input.languageId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
    } else {
      result = await client.getProjectProgress(projectId, {
        limit: ctx.input.limit,
        offset: ctx.input.offset
      });
    }

    let progress = result.data.map((item: any) => ({
      languageId: item.data.languageId || undefined,
      fileId: item.data.fileId || undefined,
      words: item.data.words,
      phrases: item.data.phrases,
      translationProgress: item.data.translationProgress,
      approvalProgress: item.data.approvalProgress
    }));

    return {
      output: { progress },
      message: `Retrieved translation progress for **${progress.length}** ${scope === 'language' ? 'files' : 'languages'}.`
    };
  })
  .build();
