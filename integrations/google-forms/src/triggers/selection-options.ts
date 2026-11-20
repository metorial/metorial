import { isDriveScopeMissing, listDriveFileOptions } from '@slates/google-drive-files';
import {
  buildApiServiceError,
  createApiServiceError,
  type SlateTriggerGroupSelectionOptionsHandler
} from 'slates';

const FORM_MIME_TYPE = 'application/vnd.google-apps.form';

// The Forms API has no list method; forms are files in Google Drive.
export const formOptions: SlateTriggerGroupSelectionOptionsHandler<
  {},
  { token: string }
> = async ctx => {
  const { query, pageToken } = ctx.input;
  try {
    return await listDriveFileOptions(ctx, {
      mimeType: FORM_MIME_TYPE,
      search: query,
      pageToken
    });
  } catch (error) {
    if (isDriveScopeMissing(error))
      throw createApiServiceError(
        "This Google connection is not allowed to list your forms because it has no Google Drive access. Paste the form ID instead: the part of the form's edit link between /d/ and /edit.",
        {
          reason: 'google_forms_drive_scope_missing',
          upstreamStatus: 403,
          parent: error
        }
      );
    throw buildApiServiceError(error, {
      providerLabel: 'Google Drive',
      operation: 'list forms',
      reason: 'google_forms_selection_options_failed'
    });
  }
};

export const formSelection = {
  list: formOptions,
  linked: {
    slate: 'google/google-drive',
    optionList: 'files',
    params: { mimeType: FORM_MIME_TYPE }
  }
};
