import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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

    let updateData: Record<string, any> = {};
    if (ctx.input.name !== undefined) updateData.name = ctx.input.name;
    if (ctx.input.duration !== undefined) updateData.duration = ctx.input.duration;
    if (ctx.input.instructions !== undefined) updateData.instructions = ctx.input.instructions;
    if (ctx.input.languages !== undefined) updateData.languages = ctx.input.languages;
    if (ctx.input.experience !== undefined) updateData.experience = ctx.input.experience;
    if (ctx.input.cutoffScore !== undefined) updateData.cutoff_score = ctx.input.cutoffScore;
    if (ctx.input.tags !== undefined) updateData.tags = ctx.input.tags;
    if (ctx.input.candidateTabSwitch !== undefined)
      updateData.candidate_tab_switch = ctx.input.candidateTabSwitch;
    if (ctx.input.hideCompileTest !== undefined)
      updateData.hide_compile_test = ctx.input.hideCompileTest;

    let result = await client.updateTest(ctx.input.testId, updateData);
    let test = result.data ?? result;

    return {
      output: {
        test
      },
      message: `Updated test **${test.name ?? ctx.input.testId}**.`
    };
  });
