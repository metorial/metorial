import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
        .describe('Expected experience level (e.g., "intern", "entry", "mid", "senior")'),
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

    let result = await client.createTest({
      name: ctx.input.name,
      duration: ctx.input.duration,
      instructions: ctx.input.instructions,
      languages: ctx.input.languages,
      experience: ctx.input.experience,
      cutoff_score: ctx.input.cutoffScore,
      tags: ctx.input.tags,
      candidate_tab_switch: ctx.input.candidateTabSwitch,
      hide_compile_test: ctx.input.hideCompileTest
    });

    let test = result.data ?? result;

    return {
      output: {
        test
      },
      message: `Created test **${test.name ?? ctx.input.name}**.`
    };
  });
