import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { testSettings } from '../lib/validation';
import { spec } from '../spec';

export let createTest = SlateTool.create(spec, {
  name: 'Create Test',
  key: 'create_test',
  description: `Create a new coding assessment test. Configure the test name, duration, instructions, supported programming languages, and other settings. Questions can be added separately after creation.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
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
      name: z.string().describe('Name of the test'),
      duration: z.number().optional().describe('Test duration in minutes'),
      instructions: z
        .string()
        .optional()
        .describe('Instructions displayed to candidates before starting the test'),
      languages: z
        .array(z.string())
        .optional()
        .describe('Supported programming languages for the test'),
      experience: z
        .string()
        .optional()
        .describe(
          'One documented experience level (e.g., "Intern", "New Graduate", "0-2 years"). Use experienceLevels for multiple values.'
        ),
      cutoffScore: z.number().optional().describe('Minimum passing score for the test'),
      tags: z.array(z.string()).optional().describe('Tags to categorize the test'),
      candidateTabSwitch: z
        .boolean()
        .optional()
        .describe('Whether to detect and flag candidate tab switching'),
      hideCompileTest: z
        .boolean()
        .optional()
        .describe('Whether to hide the compile/test button from candidates')
    })
  )
  .output(
    z.object({
      test: z.record(z.string(), z.any()).describe('Created test object')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (
      ctx.input.duration === undefined ||
      ctx.input.roleIds === undefined ||
      (ctx.input.experience === undefined && ctx.input.experienceLevels === undefined)
    ) {
      throw createApiServiceError(
        'HackerRank requires duration, roleIds, and experience or experienceLevels when creating a test.'
      );
    }
    let result = await client.createTest({ ...testSettings(ctx.input), name: ctx.input.name });

    let test = result.data ?? result;

    return {
      output: {
        test
      },
      message: `Created test **${test.name ?? ctx.input.name}**.`
    };
  });
