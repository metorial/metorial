// Accepts a bare spreadsheet ID or a link such as
// https://docs.google.com/spreadsheets/d/<id>/edit?gid=<tab id>#gid=<tab id>.
export const parseSpreadsheetReference = (
  value: string
): { spreadsheetId: string; sheetId?: number } => {
  const trimmed = value.trim();
  const id = /\/spreadsheets\/(?:u\/\d+\/)?d\/([A-Za-z0-9_-]+)/.exec(trimmed)?.[1];
  if (!id) return { spreadsheetId: trimmed };
  const gid = /[?#&]gid=(\d+)/.exec(trimmed)?.[1];
  return gid === undefined
    ? { spreadsheetId: id }
    : { spreadsheetId: id, sheetId: Number(gid) };
};
