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
      created: z.string().describe('ISO timestamp when the test was created'),
      lastModified: z.string().describe('ISO timestamp when the test was last modified'),
      lastRunStatus: z.string().nullable().describe('Status of the most recent run'),
      isFavorite: z.boolean().describe('Whether the test is marked as a favorite'),
      startUrl: z.string().nullable().describe('URL where the test begins execution'),
      screenSizeType: z.string().nullable().describe('Screen size type for the test'),
      screenWidth: z.number().nullable().describe('Screen width in pixels'),
      screenHeight: z.number().nullable().describe('Screen height in pixels'),
      steps: z.array(
        z.object({
          stepId: z.string().describe('Unique identifier of the step'),
          type: z.string().describe('Type of step action'),
          name: z.string().nullable().describe('Name of the step'),
          groupId: z.string().nullable().describe('Component group this step belongs to'),
          isActive: z.boolean().describe('Whether the step is active')
        })
      ),
      groups: z.array(z.string()).describe('IDs of component groups linked to this test')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let test = await client.getTest(ctx.input.testId);

    return {
      output: {
        testId: test.id,
        name: test.name,
        created: test.created,
        lastModified: test.lastModified,
        lastRunStatus: test.lastRunStatus,
        isFavorite: test.isFavorite,
        startUrl: test.startUrl,
        screenSizeType: test.screenSizeType,
        screenWidth: test.screenWidth,
        screenHeight: test.screenHeight,
        steps: test.steps.map(s => ({
          stepId: s.id,
          type: s.type,
          name: s.name,
          groupId: s.groupId,
          isActive: s.isActive
        })),
        groups: test.groups
      },
      message: `Retrieved test **${test.name}** with ${test.steps.length} step(s). Last run status: ${test.lastRunStatus ?? 'never run'}.`
    };
  })
  .build();
