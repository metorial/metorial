import {
  DRIVE_FOLDER_MIME_TYPE,
  isDriveScopeMissing,
  listDriveFileOptions
} from '@slates/google-drive-files';
import { buildApiServiceError, createApiServiceError, optionList } from 'slates';
import { z } from 'zod';
import { spec } from './spec';

export const filesOptionList = optionList(spec, {
  key: 'files',
  paramsSchema: z.object({
    mimeType: z
      .string()
      .trim()
      .min(1)
      .optional()
      .describe(
        'Only list files of this exact Google Drive MIME type, such as application/vnd.google-apps.spreadsheet. Without it every file except folders is listed.'
      )
  }),
  list: async ctx => {
    const { query, pageToken, params } = ctx.input;
    try {
      return await listDriveFileOptions(ctx, {
        mimeType: params.mimeType ?? { not: DRIVE_FOLDER_MIME_TYPE },
        search: query,
        pageToken
      });
    } catch (error) {
      if (isDriveScopeMissing(error))
        throw createApiServiceError(
          'This Google Drive connection is not allowed to list your files. Enter the file ID instead.',
          {
            reason: 'google_drive_file_list_scope_missing',
            upstreamStatus: 403,
            parent: error
          }
        );
      throw buildApiServiceError(error, {
        providerLabel: 'Google Drive',
        operation: 'list files',
        reason: 'google_drive_option_list_failed'
      });
    }
  }
});
