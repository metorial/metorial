import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { FirebaseManagementClient } from '../lib/client';
import { firebaseServiceError, missingRequiredFieldError } from '../lib/errors';
import { firebaseActionScopes } from '../scopes';
import { spec } from '../spec';

let appPlatformSchema = z.enum(['android', 'ios', 'web']);

let appSchema = z.object({
  platform: appPlatformSchema.describe('Firebase app platform'),
  name: z.string().describe('Full Firebase app resource name'),
  appId: z.string().describe('Firebase-assigned app ID'),
  displayName: z.string().optional().describe('App display name'),
  projectId: z.string().optional().describe('Firebase project ID'),
  state: z.string().optional().describe('App lifecycle state'),
  apiKeyId: z.string().optional().describe('Associated API key ID'),
  packageName: z.string().optional().describe('Android package name'),
  bundleId: z.string().optional().describe('Apple bundle ID'),
  appStoreId: z.string().optional().describe('Apple App Store ID'),
  teamId: z.string().optional().describe('Apple team ID'),
  appUrls: z.array(z.string()).optional().describe('Web app URLs'),
  sha1Hashes: z.array(z.string()).optional().describe('Android SHA-1 hashes'),
  sha256Hashes: z.array(z.string()).optional().describe('Android SHA-256 hashes'),
  expireTime: z.string().optional().describe('Deleted app expiration time'),
  etag: z.string().optional().describe('App ETag')
});

let configSchema = z.object({
  platform: appPlatformSchema.describe('Firebase app platform'),
  projectId: z.string().optional().describe('Firebase project ID'),
  appId: z.string().optional().describe('Firebase app ID'),
  apiKey: z.string().optional().describe('Web app API key'),
  authDomain: z.string().optional().describe('Web app auth domain'),
  databaseURL: z.string().optional().describe('Default Realtime Database URL'),
  storageBucket: z.string().optional().describe('Default Cloud Storage bucket'),
  messagingSenderId: z.string().optional().describe('Cloud Messaging sender ID'),
  measurementId: z.string().optional().describe('Google Analytics measurement ID'),
  projectNumber: z.string().optional().describe('Firebase project number'),
  locationId: z.string().optional().describe('Project location ID'),
  configFilename: z
    .string()
    .optional()
    .describe('Native app config artifact filename, such as google-services.json'),
  configFileContents: z
    .string()
    .optional()
    .describe('Base64-encoded native app config artifact contents')
});

let platforms = ['android', 'ios', 'web'] as const;

export let getFirebaseApps = SlateTool.create(spec, {
  name: 'Get Firebase Apps',
  key: 'get_firebase_apps',
  description: `List Firebase Android, iOS, and Web apps in a project, retrieve a specific app, or download its SDK configuration artifact. Use this to discover app IDs, package or bundle identifiers, web config, and native google-services files.`,
  instructions: [
    'Use "list" to discover apps in the configured Firebase project.',
    'Use "get" with platform and appId to retrieve one app.',
    'Use "get_config" with platform and appId to download the app SDK config artifact.',
    'For appId you can pass either the Firebase app ID or the full resource name.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(firebaseActionScopes.getFirebaseApps)
  .input(
    z.object({
      operation: z.enum(['list', 'get', 'get_config']).describe('Operation to perform'),
      platform: z
        .enum(['all', 'android', 'ios', 'web'])
        .optional()
        .describe(
          'App platform. Defaults to all platforms for list. Required for get/get_config.'
        ),
      appId: z
        .string()
        .optional()
        .describe('Firebase app ID or full app resource name. Required for get/get_config.'),
      pageSize: z.number().optional().describe('Maximum apps to return per platform.'),
      pageToken: z
        .string()
        .optional()
        .describe('Page token for listing one specific platform.'),
      showDeleted: z
        .boolean()
        .optional()
        .describe('Whether deleted apps should be included in list results.')
    })
  )
  .output(
    z.object({
      apps: z.array(appSchema).optional().describe('Listed Firebase apps'),
      app: appSchema.optional().describe('Retrieved Firebase app'),
      config: configSchema.optional().describe('Firebase app SDK configuration'),
      nextPageToken: z
        .string()
        .optional()
        .describe('Next page token when listing one platform'),
      nextPageTokens: z
        .record(z.string(), z.string())
        .optional()
        .describe('Next page tokens keyed by platform when listing all platforms'),
      totalReturned: z.number().optional().describe('Number of apps returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FirebaseManagementClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId
    });

    let { operation, platform, appId } = ctx.input;

    if (operation === 'list') {
      if ((platform === undefined || platform === 'all') && ctx.input.pageToken) {
        throw firebaseServiceError('platform must be specified when using pageToken');
      }

      let selectedPlatforms = platform && platform !== 'all' ? [platform] : [...platforms];
      let apps: any[] = [];
      let nextPageTokens: Record<string, string> = {};

      for (let selectedPlatform of selectedPlatforms) {
        let result = await client.listApps(selectedPlatform, {
          pageSize: ctx.input.pageSize,
          pageToken: ctx.input.pageToken,
          showDeleted: ctx.input.showDeleted
        });
        apps.push(...result.apps);
        if (result.nextPageToken) {
          nextPageTokens[selectedPlatform] = result.nextPageToken;
        }
      }

      return {
        output: {
          apps,
          nextPageToken:
            selectedPlatforms.length === 1 ? nextPageTokens[selectedPlatforms[0]!] : undefined,
          nextPageTokens:
            selectedPlatforms.length > 1 && Object.keys(nextPageTokens).length > 0
              ? nextPageTokens
              : undefined,
          totalReturned: apps.length
        },
        message: `Listed **${apps.length}** Firebase app(s).`
      };
    }

    if (!platform || platform === 'all') {
      throw firebaseServiceError('platform is required for get and get_config operations');
    }
    if (!appId) throw missingRequiredFieldError('appId', operation);

    if (operation === 'get') {
      let app = await client.getApp(platform, appId);
      return {
        output: { app },
        message: `Retrieved ${platform} app **${app.displayName || app.appId}**.`
      };
    }

    if (operation === 'get_config') {
      let config = await client.getAppConfig(platform, appId);
      return {
        output: { config },
        message: `Retrieved ${platform} app config for **${appId}**.`
      };
    }

    throw firebaseServiceError(`Unknown operation: ${operation}`);
  })
  .build();
