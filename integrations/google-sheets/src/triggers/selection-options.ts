import { isDriveScopeMissing, listDriveFileOptions } from '@slates/google-drive-files';
import {
  buildApiServiceError,
  createApiServiceError,
  type SlateTriggerGroupSelectionOptionsHandler
} from 'slates';
import { SheetsClient } from '../lib/client';
import { parseSpreadsheetReference } from '../lib/spreadsheet-reference';

type OptionsHandler = SlateTriggerGroupSelectionOptionsHandler<{}, { token: string }>;
type Option = Awaited<ReturnType<OptionsHandler>>['options'][number];

export const SELECTION_OPTIONS_PER_PAGE = 50;
const SPREADSHEET_MIME_TYPE = 'application/vnd.google-apps.spreadsheet';

const matchesQuery = (query: string | null, ...texts: string[]) =>
  !query || texts.some(text => text.toLowerCase().includes(query.toLowerCase()));

const pageOf = (options: Option[], pageToken: unknown) => {
  const offset =
    typeof pageToken === 'number' && Number.isSafeInteger(pageToken) && pageToken > 0
      ? pageToken
      : 0;
  const next = offset + SELECTION_OPTIONS_PER_PAGE;
  return {
    options: options.slice(offset, next),
    nextPageToken: next < options.length ? next : null
  };
};

const selectedSpreadsheetId = (selection: Record<string, unknown>) =>
  typeof selection.spreadsheetId === 'string' && selection.spreadsheetId.trim()
    ? parseSpreadsheetReference(selection.spreadsheetId).spreadsheetId
    : null;

const sheetsFailure = (error: unknown, operation: string) =>
  buildApiServiceError(error, {
    providerLabel: 'Google Sheets',
    operation,
    reason: 'google_sheets_selection_options_failed'
  });

const listTabs = async (client: SheetsClient, spreadsheetId: string) => {
  try {
    return await client.listTabs(spreadsheetId);
  } catch (error) {
    throw sheetsFailure(error, 'list tabs');
  }
};

export const spreadsheetOptions: OptionsHandler = async ctx => {
  const { query, pageToken } = ctx.input;
  try {
    return await listDriveFileOptions(ctx, {
      mimeType: SPREADSHEET_MIME_TYPE,
      search: query,
      pageToken
    });
  } catch (error) {
    if (isDriveScopeMissing(error))
      throw createApiServiceError(
        'This Google connection is not allowed to list your spreadsheets because it has no Google Drive access. Paste the link or ID of the spreadsheet instead.',
        {
          reason: 'google_sheets_drive_scope_missing',
          upstreamStatus: 403,
          parent: error
        }
      );
    throw buildApiServiceError(error, {
      providerLabel: 'Google Drive',
      operation: 'list spreadsheets',
      reason: 'google_sheets_selection_options_failed'
    });
  }
};

export const spreadsheetSelection = {
  list: spreadsheetOptions,
  linked: {
    slate: 'google/google-drive',
    optionList: 'files',
    params: { mimeType: SPREADSHEET_MIME_TYPE }
  }
};

export const tabOptions: OptionsHandler = async ctx => {
  const spreadsheetId = selectedSpreadsheetId(ctx.input.selection);
  if (!spreadsheetId) return { options: [] };
  const tabs = await listTabs(new SheetsClient(ctx.auth.token), spreadsheetId);
  return pageOf(
    tabs
      .filter(tab => tab.isGrid && matchesQuery(ctx.input.query, tab.title))
      .map(tab => ({ value: tab.sheetId, label: tab.title })),
    ctx.input.pageToken
  );
};
