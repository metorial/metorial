import { SlateTool } from 'slates';
import { z } from 'zod';
import { GoogleDriveClient } from '../lib/client';
import { googleDriveActionScopes } from '../scopes';
import { spec } from '../spec';

let driveAppSchema = z.object({
  appId: z.string().describe('Drive app ID'),
  name: z.string().optional().describe('App name'),
  objectType: z
    .string()
    .optional()
    .describe('Type of object the app creates, such as "Chart"'),
  shortDescription: z.string().optional().describe('Short app description'),
  longDescription: z.string().optional().describe('Long app description'),
  productId: z.string().optional().describe('Google Workspace Marketplace product ID'),
  productUrl: z.string().optional().describe('Marketplace listing URL'),
  installed: z.boolean().optional().describe('Whether the app is installed for the user'),
  authorized: z
    .boolean()
    .optional()
    .describe("Whether the app is authorized to access the user's Drive"),
  useByDefault: z
    .boolean()
    .optional()
    .describe('Whether the app is the default handler for the types it supports'),
  hasDriveWideScope: z
    .boolean()
    .optional()
    .describe("Whether the app has access to all of the user's Drive files"),
  supportsCreate: z.boolean().optional().describe('Whether the app can create new files'),
  supportsImport: z
    .boolean()
    .optional()
    .describe('Whether the app can import Google Docs files'),
  supportsMultiOpen: z
    .boolean()
    .optional()
    .describe('Whether the app can open several files at once'),
  supportsOfflineCreate: z
    .boolean()
    .optional()
    .describe('Whether the app can create files while offline'),
  primaryMimeTypes: z
    .array(z.string())
    .optional()
    .describe('Primary MIME types the app opens'),
  secondaryMimeTypes: z
    .array(z.string())
    .optional()
    .describe('Secondary MIME types the app opens'),
  primaryFileExtensions: z
    .array(z.string())
    .optional()
    .describe('Primary file extensions the app opens'),
  secondaryFileExtensions: z
    .array(z.string())
    .optional()
    .describe('Secondary file extensions the app opens'),
  openUrlTemplate: z
    .string()
    .optional()
    .describe('URL template for opening a file, with {ids} or {exportIds} placeholders'),
  createUrl: z.string().optional().describe('URL for creating a new file with the app'),
  createInFolderTemplate: z
    .string()
    .optional()
    .describe('URL template for creating a file in a folder, with a {folderId} placeholder'),
  icons: z
    .array(
      z.object({
        size: z.number().optional().describe('Icon size in pixels'),
        category: z
          .string()
          .optional()
          .describe('Icon category: application, document, or documentShared'),
        iconUrl: z.string().optional().describe('Icon URL')
      })
    )
    .optional()
    .describe('App icons')
});

let filterList = () => z.array(z.string().trim().min(1)).optional();

export let listDriveAppsTool = SlateTool.create(spec, {
  name: 'List Drive Apps',
  key: 'list_drive_apps',
  description:
    'List the Google Drive apps installed for the authenticated user, such as editors and viewers that can open or create files. Optionally filter to apps that handle given file extensions or MIME types, and see which apps the user chose as defaults.',
  instructions: [
    'Use appFilterExtensions (for example ["csv"]) or appFilterMimeTypes (for example ["image/png"]) to find apps that can open a particular kind of file.'
  ],
  tags: {
    readOnly: true
  }
})
  .scopes(googleDriveActionScopes.listDriveApps)
  .input(
    z.object({
      appFilterExtensions: filterList().describe(
        'Only return apps that open these file extensions, without the leading dot'
      ),
      appFilterMimeTypes: filterList().describe('Only return apps that open these MIME types'),
      languageCode: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          'BCP 47 language code for localized app names and descriptions, e.g. "en-US"'
        )
    })
  )
  .output(
    z.object({
      apps: z.array(driveAppSchema).describe('Installed Drive apps'),
      defaultAppIds: z
        .array(z.string())
        .describe('IDs of the apps the user chose to use by default')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let result = await client.listApps({
      appFilterExtensions: ctx.input.appFilterExtensions,
      appFilterMimeTypes: ctx.input.appFilterMimeTypes,
      languageCode: ctx.input.languageCode
    });

    return {
      output: result,
      message: `Found **${result.apps.length}** Drive app(s).`
    };
  })
  .build();

export let getDriveAppTool = SlateTool.create(spec, {
  name: 'Get Drive App',
  key: 'get_drive_app',
  description:
    'Get details about one Google Drive app by ID, including the file types it opens, whether it is installed and authorized, and its open and create URL templates.',
  instructions: ['Call list_drive_apps to discover app IDs.'],
  tags: {
    readOnly: true
  }
})
  .scopes(googleDriveActionScopes.getDriveApp)
  .input(
    z.object({
      appId: z
        .string()
        .trim()
        .min(1)
        .describe('Drive app ID. Call list_drive_apps to discover app IDs.')
    })
  )
  .output(driveAppSchema)
  .handleInvocation(async ctx => {
    let client = new GoogleDriveClient(ctx.auth.token);
    let app = await client.getApp(ctx.input.appId);

    return {
      output: app,
      message: `Retrieved Drive app **${app.name ?? app.appId}**.`
    };
  })
  .build();
