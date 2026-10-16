import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { testSettings } from '../lib/validation';
import { spec } from '../spec';

export let updateTest = SlateTool.create(spec, {
  name: 'Update Test',
  key: 'update_test',
  description: `Update an existing coding assessment test. Modify test settings such as name, duration, instructions, languages, and other configuration options. You can also archive or delete a test.`,
  instructions: [
    'To archive a test, set the "archive" field to true.',
    'To delete a test, set the "remove" field to true. This is irreversible.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      testId: z.string().describe('ID of the test to update'),
      roleIds: z
        .array(z.string())
        .optional()
        .describe(
          'Role IDs associated with the test; required by HackerRank when creating a test'
        ),
      experienceLevels: z
        .array(z.string())
        .optional()
        .describe(
          'Experience levels: Intern, New Graduate, 0-2 years, 2-5 years, >5 years, All Experience Levels. Use instead of experience for multiple levels.'
        ),
      questionIds: z
        .array(z.string())
        .optional()
        .describe('Question IDs to include; call list_questions to discover IDs'),
      draft: z
        .boolean()
        .optional()
        .describe('Whether the test is a draft; only published tests accept invitations'),
      startTime: z
        .string()
        .optional()
        .describe('Earliest test login time as an ISO 8601 timestamp'),
      endTime: z
        .string()
        .optional()
        .describe('Latest test login time as an ISO 8601 timestamp'),
      name: z.string().optional().describe('New name for the test'),
      duration: z.number().optional().describe('New test duration in minutes'),
      instructions: z.string().optional().describe('New instructions for the test'),
      languages: z
        .array(z.string())
        .optional()
        .describe('Updated supported programming languages'),
      experience: z.string().optional().describe('Updated experience level'),
      cutoffScore: z.number().optional().describe('Updated minimum passing score'),
      tags: z.array(z.string()).optional().describe('Updated tags'),
      candidateTabSwitch: z.boolean().optional().describe('Whether to detect tab switching'),
      hideCompileTest: z.boolean().optional().describe('Whether to hide compile/test button'),
      archive: z.boolean().optional().describe('Set to true to archive the test'),
      remove: z.boolean().optional().describe('Set to true to permanently delete the test')
    })
  )
  .output(
    z.object({
      test: z
        .record(z.string(), z.any())
        .optional()
        .describe('Updated test object (absent if deleted)'),
      deleted: z.boolean().optional().describe('Whether the test was deleted'),
      archived: z.boolean().optional().describe('Whether the test was archived')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let updateData = testSettings(ctx.input);
    if (
      (ctx.input.remove && ctx.input.archive) ||
      ((ctx.input.remove || ctx.input.archive) && Object.keys(updateData).length > 0)
    ) {
      throw createApiServiceError('Choose one operation: update fields, archive, or remove.');
    }
    if (ctx.input.remove) {
      await client.deleteTest(ctx.input.testId);
      return {
        output: {
          deleted: true
        },
        message: `Deleted test **${ctx.input.testId}**.`
      };
    }

    if (ctx.input.archive) {
      await client.archiveTest(ctx.input.testId);
      return {
        output: {
          archived: true
        },
        message: `Archived test **${ctx.input.testId}**.`
      };
    }

    if (Object.keys(updateData).length === 0)
      throw createApiServiceError('Provide at least one test setting to update.');

    let result = await client.updateTest(ctx.input.testId, updateData);
    let test = result.data ?? result;

    return {
      output: {
        test
      },
      message: `Updated test **${test.name ?? ctx.input.testId}**.`
    };
  });
