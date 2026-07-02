import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageDistribution = SlateTool.create(spec, {
  name: 'Manage Distribution',
  key: 'manage_distribution',
  description: `Manage testing distribution operations including viewing app versions, sending builds to testers, and getting download links. Use **action** to specify the operation.`,
  instructions: [
    'Use action "list_app_versions" to list app versions in a distribution profile.',
    'Use action "get_app_version" to get details of a specific app version.',
    'Use action "send_to_testing" to share an app version with testers.',
    'Use action "get_download_link" to get a temporary download link for an app version.',
    'Use action "delete_app_version" to remove an app version from a distribution profile.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'list_app_versions',
          'get_app_version',
          'send_to_testing',
          'get_download_link',
          'delete_app_version'
        ])
        .describe('The operation to perform'),
      profileId: z.string().describe('ID of the distribution profile'),
      appVersionId: z
        .string()
        .optional()
        .describe('ID of the app version (required for single-version operations)'),
      page: z.number().optional().describe('Page number for pagination (list_app_versions)'),
      size: z.number().optional().describe('Number of results per page (list_app_versions)'),
      testingGroupIds: z
        .array(z.string())
        .optional()
        .describe('Testing group IDs to send the build to (send_to_testing)'),
      message: z
        .string()
        .optional()
        .describe('Message to include with the test distribution (send_to_testing)')
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    switch (ctx.input.action) {
      case 'list_app_versions': {
        let versions = await client.listDistributionAppVersions(ctx.input.profileId, {
          page: ctx.input.page,
          size: ctx.input.size
        });
        let items = Array.isArray(versions) ? versions : [];
        return { output: items, message: `Found **${items.length}** app version(s).` };
      }
      case 'get_app_version': {
        if (!ctx.input.appVersionId) throw new Error('appVersionId is required');
        let version = await client.getDistributionAppVersion(
          ctx.input.profileId,
          ctx.input.appVersionId
        );
        return {
          output: version,
          message: `Retrieved app version **${ctx.input.appVersionId}**.`
        };
      }
      case 'send_to_testing': {
        if (!ctx.input.appVersionId) throw new Error('appVersionId is required');
        let result = await client.sendToTesting(ctx.input.profileId, ctx.input.appVersionId, {
          testingGroupIds: ctx.input.testingGroupIds,
          message: ctx.input.message
        });
        return {
          output: result,
          message: `Sent app version **${ctx.input.appVersionId}** to testers.`
        };
      }
      case 'get_download_link': {
        if (!ctx.input.appVersionId) throw new Error('appVersionId is required');
        let link = await client.getDistributionDownloadLink(
          ctx.input.profileId,
          ctx.input.appVersionId
        );
        return {
          output: { downloadLink: link },
          message: `Download link generated for app version **${ctx.input.appVersionId}**.`
        };
      }
      case 'delete_app_version': {
        if (!ctx.input.appVersionId) throw new Error('appVersionId is required');
        await client.deleteDistributionAppVersion(ctx.input.profileId, ctx.input.appVersionId);
        return {
          output: { success: true },
          message: `Deleted app version **${ctx.input.appVersionId}**.`
        };
      }
    }
  })
  .build();
