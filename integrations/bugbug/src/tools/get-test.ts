import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getTest = SlateTool.create(spec, {
  name: 'Get Test',
  key: 'get_test',
  description: `Retrieve detailed information about a specific test, including its steps, start URL, screen size configuration, and linked components. Useful for inspecting test structure before running it.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      testId: z.string().describe('Unique identifier of the test to retrieve')
    })
  )
  .output(
    z.object({
      testId: z.string().describe('Unique identifier of the test'),
      name: z.string().describe('Name of the test'),
      created: z.string().optional().describe('ISO timestamp when the test was created'),
      lastModified: z
        .string()
        .optional()
        .describe('ISO timestamp when the test was last modified'),
      lastRunStatus: z.string().nullable().describe('Status of the most recent run'),
      isFavorite: z.boolean().optional().describe('Whether the test is marked as a favorite'),
      startUrl: z.string().nullable().describe('URL where the test begins execution'),
      screenSizeType: z.string().nullable().describe('Screen size type for the test'),
      screenWidth: z.number().nullable().describe('Screen width in pixels'),
      screenHeight: z.number().nullable().describe('Screen height in pixels'),
      steps: z
        .array(
          z.object({
            stepId: z.string().describe('Unique identifier of the step'),
            type: z.string().describe('Type of step action'),
            name: z.string().nullable().describe('Name of the step'),
            groupId: z.string().nullable().describe('Component group this step belongs to'),
            isActive: z.boolean().optional().describe('Whether the step is active')
          })
        )
        .optional(),
      groups: z
        .array(z.string())
        .optional()
        .describe('IDs of component groups linked to this test')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let test = await client.getTest(ctx.input.testId);

    let groups = Array.isArray(test.groups) ? test.groups : undefined;
    let steps = test.steps;
    if (
      steps === undefined &&
      groups?.some(group => typeof group !== 'string' && group.steps !== undefined)
    ) {
      steps = groups.flatMap(group => (typeof group === 'string' ? [] : (group.steps ?? [])));
    }

    return {
      output: {
        testId: test.id,
        name: test.name,
        created: test.created,
        lastModified: test.lastModified,
        lastRunStatus: test.latestRun?.status ?? test.lastRunStatus ?? null,
        isFavorite: test.isFavorite,
        startUrl: test.startUrl ?? null,
        screenSizeType: test.screenSizeType ?? null,
        screenWidth: test.screenWidth ?? null,
        screenHeight: test.screenHeight ?? null,
        steps: steps?.map(s => ({
          stepId: s.id,
          type: s.type,
          name: s.name ?? null,
          groupId: s.groupId ?? null,
          isActive: s.isActive
        })),
        groups: groups?.map(group => (typeof group === 'string' ? group : group.id))
      },
      message: `Retrieved test **${test.name}**${steps ? ` with ${steps.length} step(s)` : ''}. Last run status: ${test.lastRunStatus ?? 'not available'}.`
    };
  })
  .build();
