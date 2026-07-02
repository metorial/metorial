import { SlateTool } from 'slates';
import { z } from 'zod';
import { MobileFriendlyTestClient } from '../lib/client';
import { googleSearchConsoleActionScopes } from '../scopes';
import { spec } from '../spec';

export let runMobileFriendlyTest = SlateTool.create(spec, {
  name: 'Run Mobile-Friendly Test',
  key: 'run_mobile_friendly_test',
  description: `Run Google's Mobile-Friendly Test for a given URL. Checks whether a page is mobile-friendly according to Google's standards and reports any issues found.`,
  constraints: [
    'This API was deprecated by Google in December 2023 and may not be available.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleSearchConsoleActionScopes.runMobileFriendlyTest)
  .input(
    z.object({
      url: z.string().describe('The fully-qualified URL to test for mobile-friendliness')
    })
  )
  .output(
    z.object({
      testStatus: z
        .object({
          status: z
            .string()
            .describe('Test completion status: COMPLETE, INTERNAL_ERROR, or PAGE_UNREACHABLE'),
          details: z.string().optional().describe('Additional details about the test status')
        })
        .describe('Status of the test execution'),
      mobileFriendliness: z
        .string()
        .describe('Result: MOBILE_FRIENDLY or NOT_MOBILE_FRIENDLY'),
      mobileFriendlyIssues: z
        .array(
          z.object({
            rule: z
              .string()
              .describe(
                'The mobile-friendliness rule violated (e.g., USE_LEGIBLE_FONT_SIZES, CONFIGURE_VIEWPORT)'
              )
          })
        )
        .optional()
        .describe('List of mobile-friendliness issues found'),
      resourceIssues: z
        .array(
          z.object({
            blockedResourceUrl: z.string().describe('URL of the blocked resource')
          })
        )
        .optional()
        .describe('Resources that could not be loaded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MobileFriendlyTestClient();

    let result = await client.runTest({ url: ctx.input.url }, ctx.auth.token);

    let resourceIssues = result.resourceIssues?.map(ri => ({
      blockedResourceUrl: ri.blockedResource.url
    }));

    let issueCount = result.mobileFriendlyIssues?.length ?? 0;

    return {
      output: {
        testStatus: result.testStatus,
        mobileFriendliness: result.mobileFriendliness,
        mobileFriendlyIssues: result.mobileFriendlyIssues,
        resourceIssues
      },
      message: `Mobile-friendly test for **${ctx.input.url}**: **${result.mobileFriendliness}** (status: ${result.testStatus.status}). ${issueCount > 0 ? `Found **${issueCount}** issue${issueCount === 1 ? '' : 's'}.` : 'No issues found.'}`
    };
  })
  .build();
