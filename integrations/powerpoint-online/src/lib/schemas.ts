import { z } from 'zod';

export let driveItemLocationSchema = z.object({
  itemId: z
    .string()
    .optional()
    .describe('Unique ID of the file or folder. Provide either itemId or itemPath.'),
  itemPath: z
    .string()
    .optional()
    .describe(
      'Path to the file or folder relative to the drive root, e.g. "/Documents/Presentation.pptx". Provide either itemId or itemPath.'
    ),
  driveId: z
    .string()
    .optional()
    .describe("ID of the drive containing the item. Omit to use the current user's OneDrive."),
  siteId: z
    .string()
    .optional()
    .describe(
      "SharePoint site ID. If provided, operates on the site's default document library."
    )
});

export let driveItemOutputSchema = z.object({
  itemId: z.string().describe('Unique ID of the file or folder'),
  name: z.string().describe('Name of the file or folder'),
  size: z.number().optional().describe('File size in bytes'),
  webUrl: z.string().optional().describe('URL to open the file in a browser'),
  createdAt: z.string().optional().describe('ISO 8601 creation timestamp'),
  lastModifiedAt: z.string().optional().describe('ISO 8601 last modified timestamp'),
  createdByName: z
    .string()
    .optional()
    .describe('Display name of the user who created the item'),
  lastModifiedByName: z
    .string()
    .optional()
    .describe('Display name of the user who last modified the item'),
  parentDriveId: z.string().optional().describe('ID of the parent drive'),
  parentFolderId: z.string().optional().describe('ID of the parent folder'),
  parentFolderPath: z.string().optional().describe('Path of the parent folder'),
  mimeType: z.string().optional().describe('MIME type of the file'),
  isFolder: z.boolean().describe('Whether this item is a folder'),
  childCount: z.number().optional().describe('Number of child items (for folders)')
});

export type DriveItemOutput = z.infer<typeof driveItemOutputSchema>;

export let mapDriveItem = (item: any): DriveItemOutput => ({
  itemId: item.id,
  name: item.name,
  size: item.size,
  webUrl: item.webUrl,
  createdAt: item.createdDateTime,
  lastModifiedAt: item.lastModifiedDateTime,
  createdByName: item.createdBy?.user?.displayName,
  lastModifiedByName: item.lastModifiedBy?.user?.displayName,
  parentDriveId: item.parentReference?.driveId,
  parentFolderId: item.parentReference?.id,
  parentFolderPath: item.parentReference?.path,
  mimeType: item.file?.mimeType,
  isFolder: !!item.folder,
  childCount: item.folder?.childCount
});
