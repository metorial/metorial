import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let managePublish = SlateTool.create(spec, {
  name: 'Manage Publish',
  key: 'manage_publish',
  description: `Manage store publishing operations for App Store, Google Play, Huawei AppGallery, and Microsoft Intune. Supports listing profiles and app versions, viewing publish details, and controlling publish flows (start, cancel, restart).`,
  instructions: [
    'Use action "list_profiles" to list all publish profiles for a platform.',
    'Use action "get_profile" to get a specific publish profile.',
    'Use action "list_app_versions" to list app versions in a publish profile.',
    'Use action "get_publish_details" to view the publish status and flow of a version.',
    'Use action "start_publish" to begin publishing a version to a store.',
    'Use action "cancel_publish" to stop an active publish.',
    'Use action "restart_publish" to restart publishing with latest flow changes.',
    'platformType values: 0 = App Store (iOS), 1 = Google Play (Android), 2 = Huawei AppGallery, 3 = Microsoft Intune.'
  ]
})
  .input(
    z.object({
      action: z
        .enum([
          'list_profiles',
          'get_profile',
          'list_app_versions',
          'get_publish_details',
          'start_publish',
          'cancel_publish',
          'restart_publish'
        ])
        .describe('The operation to perform'),
      platformType: z
        .string()
        .describe(
          'Platform type: 0 = App Store, 1 = Google Play, 2 = Huawei AppGallery, 3 = Microsoft Intune'
        ),
      profileId: z
        .string()
        .optional()
        .describe('ID of the publish profile (required for profile-specific operations)'),
      appVersionId: z
        .string()
        .optional()
        .describe('ID of the app version (required for version-specific operations)'),
      publishId: z
        .string()
        .optional()
        .describe('ID of the publish (required for publish flow operations)'),
      stepId: z
        .string()
        .optional()
        .describe('ID of a specific step to start (start_publish only)'),
      page: z.number().optional().describe('Page number for pagination'),
      size: z.number().optional().describe('Number of results per page')
    })
  )
  .output(z.any())
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, platformType } = ctx.input;

    switch (action) {
      case 'list_profiles': {
        let profiles = await client.listPublishProfiles(platformType, {
          page: ctx.input.page,
          size: ctx.input.size
        });
        let items = Array.isArray(profiles) ? profiles : [];
        return { output: items, message: `Found **${items.length}** publish profile(s).` };
      }
      case 'get_profile': {
        if (!ctx.input.profileId) throw new Error('profileId is required');
        let profile = await client.getPublishProfile(platformType, ctx.input.profileId);
        return {
          output: profile,
          message: `Retrieved publish profile **${ctx.input.profileId}**.`
        };
      }
      case 'list_app_versions': {
        if (!ctx.input.profileId) throw new Error('profileId is required');
        let versions = await client.listPublishAppVersions(platformType, ctx.input.profileId, {
          page: ctx.input.page,
          size: ctx.input.size
        });
        let items = Array.isArray(versions) ? versions : [];
        return { output: items, message: `Found **${items.length}** app version(s).` };
      }
      case 'get_publish_details': {
        if (!ctx.input.profileId || !ctx.input.appVersionId)
          throw new Error('profileId and appVersionId are required');
        let details = await client.getPublishDetails(
          platformType,
          ctx.input.profileId,
          ctx.input.appVersionId
        );
        return {
          output: details,
          message: `Retrieved publish details for version **${ctx.input.appVersionId}**.`
        };
      }
      case 'start_publish': {
        if (!ctx.input.profileId || !ctx.input.publishId)
          throw new Error('profileId and publishId are required');
        let result = await client.startPublish(
          platformType,
          ctx.input.profileId,
          ctx.input.publishId,
          ctx.input.stepId
        );
        return { output: result, message: `Started publish **${ctx.input.publishId}**.` };
      }
      case 'cancel_publish': {
        if (!ctx.input.profileId || !ctx.input.publishId)
          throw new Error('profileId and publishId are required');
        let result = await client.cancelPublish(
          platformType,
          ctx.input.profileId,
          ctx.input.publishId
        );
        return { output: result, message: `Canceled publish **${ctx.input.publishId}**.` };
      }
      case 'restart_publish': {
        if (!ctx.input.profileId || !ctx.input.publishId)
          throw new Error('profileId and publishId are required');
        let result = await client.restartPublish(
          platformType,
          ctx.input.profileId,
          ctx.input.publishId
        );
        return { output: result, message: `Restarted publish **${ctx.input.publishId}**.` };
      }
    }
  })
  .build();
