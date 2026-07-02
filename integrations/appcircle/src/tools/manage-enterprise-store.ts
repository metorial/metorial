import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageEnterpriseStore = SlateTool.create(spec, {
  name: 'Manage Enterprise App Store',
  key: 'manage_enterprise_store',
  description: `Manage your Enterprise App Store for in-house distribution. Supports listing profiles and app versions, publishing/unpublishing versions to Beta or Live channels, and getting download links.`,
  instructions: [
    'Use action "list_profiles" to list all Enterprise Store profiles.',
    'Use action "get_profile" to get a specific Enterprise Store profile.',
    'Use action "list_app_versions" to list app versions in a profile.',
    'Use action "get_app_version" to get details of a specific app version.',
    'Use action "publish" to publish a version to Beta or Live channel.',
    'Use action "unpublish" to remove a version from the store.',
    'Use action "get_download_link" to get a download link for a version.',
    'Use action "delete_app_version" to remove an app version from the store.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'list_profiles',
          'get_profile',
          'list_app_versions',
          'get_app_version',
          'publish',
          'unpublish',
          'get_download_link',
          'delete_app_version'
        ])
        .describe('The operation to perform'),
      profileId: z.string().optional().describe('ID of the Enterprise Store profile'),
      appVersionId: z.string().optional().describe('ID of the app version'),
      publishType: z
        .enum(['Beta', 'Live'])
        .optional()
        .describe('Channel to publish to (publish action)'),
      summary: z
        .string()
        .optional()
        .describe('Summary text for the published version (publish action)'),
      releaseNotes: z
        .string()
        .optional()
        .describe('Release notes for the published version (publish action)'),
      page: z.number().optional().describe('Page number for pagination'),
      size: z.number().optional().describe('Number of results per page')
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    switch (ctx.input.action) {
      case 'list_profiles': {
        let profiles = await client.listEnterpriseStoreProfiles({
          page: ctx.input.page,
          size: ctx.input.size
        });
        let items = Array.isArray(profiles) ? profiles : [];
        return {
          output: items,
          message: `Found **${items.length}** Enterprise Store profile(s).`
        };
      }
      case 'get_profile': {
        if (!ctx.input.profileId) throw new Error('profileId is required');
        let profile = await client.getEnterpriseStoreProfile(ctx.input.profileId);
        return {
          output: profile,
          message: `Retrieved Enterprise Store profile **${ctx.input.profileId}**.`
        };
      }
      case 'list_app_versions': {
        if (!ctx.input.profileId) throw new Error('profileId is required');
        let versions = await client.listEnterpriseStoreAppVersions(ctx.input.profileId, {
          page: ctx.input.page,
          size: ctx.input.size
        });
        let items = Array.isArray(versions) ? versions : [];
        return {
          output: items,
          message: `Found **${items.length}** app version(s) in Enterprise Store.`
        };
      }
      case 'get_app_version': {
        if (!ctx.input.profileId || !ctx.input.appVersionId)
          throw new Error('profileId and appVersionId are required');
        let version = await client.getEnterpriseStoreAppVersion(
          ctx.input.profileId,
          ctx.input.appVersionId
        );
        return {
          output: version,
          message: `Retrieved Enterprise Store app version **${ctx.input.appVersionId}**.`
        };
      }
      case 'publish': {
        if (!ctx.input.profileId || !ctx.input.appVersionId)
          throw new Error('profileId and appVersionId are required');
        let result = await client.publishEnterpriseStoreAppVersion(
          ctx.input.profileId,
          ctx.input.appVersionId,
          {
            publishType: ctx.input.publishType,
            summary: ctx.input.summary,
            releaseNotes: ctx.input.releaseNotes
          }
        );
        return {
          output: result,
          message: `Published version **${ctx.input.appVersionId}** to **${ctx.input.publishType ?? 'store'}**.`
        };
      }
      case 'unpublish': {
        if (!ctx.input.profileId || !ctx.input.appVersionId)
          throw new Error('profileId and appVersionId are required');
        let result = await client.unpublishEnterpriseStoreAppVersion(
          ctx.input.profileId,
          ctx.input.appVersionId
        );
        return {
          output: result,
          message: `Unpublished version **${ctx.input.appVersionId}** from Enterprise Store.`
        };
      }
      case 'get_download_link': {
        if (!ctx.input.profileId || !ctx.input.appVersionId)
          throw new Error('profileId and appVersionId are required');
        let link = await client.getEnterpriseStoreDownloadLink(
          ctx.input.profileId,
          ctx.input.appVersionId
        );
        return {
          output: { downloadLink: link },
          message: `Download link generated for version **${ctx.input.appVersionId}**.`
        };
      }
      case 'delete_app_version': {
        if (!ctx.input.profileId || !ctx.input.appVersionId)
          throw new Error('profileId and appVersionId are required');
        await client.deleteEnterpriseStoreAppVersion(
          ctx.input.profileId,
          ctx.input.appVersionId
        );
        return {
          output: { success: true },
          message: `Deleted app version **${ctx.input.appVersionId}** from Enterprise Store.`
        };
      }
    }
  })
  .build();
