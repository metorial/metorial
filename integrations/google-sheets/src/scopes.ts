import { anyOf } from 'slates';

export let googleSheetsScopes = {
  spreadsheets: 'https://www.googleapis.com/auth/spreadsheets',
  spreadsheetsReadonly: 'https://www.googleapis.com/auth/spreadsheets.readonly',
  drive: 'https://www.googleapis.com/auth/drive',
  driveReadonly: 'https://www.googleapis.com/auth/drive.readonly',
  driveFile: 'https://www.googleapis.com/auth/drive.file',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

let spreadsheetDataRead = anyOf(
  googleSheetsScopes.spreadsheets,
  googleSheetsScopes.spreadsheetsReadonly
);

let spreadsheetDataWrite = anyOf(
  googleSheetsScopes.spreadsheets,
  googleSheetsScopes.drive,
  googleSheetsScopes.driveFile
);

export let googleSheetsActionScopes = {
  getSpreadsheet: spreadsheetDataRead,
  readCells: spreadsheetDataRead,
  createSpreadsheet: spreadsheetDataWrite,
  deleteSpreadsheet: spreadsheetDataWrite,
  updateSpreadsheet: spreadsheetDataWrite,
  batchUpdate: spreadsheetDataWrite,
  writeCells: spreadsheetDataWrite,
  clearCells: spreadsheetDataWrite,
  mergeCells: spreadsheetDataWrite,
  formatCells: spreadsheetDataWrite,
  manageSheets: spreadsheetDataWrite,
  manageNamedRanges: spreadsheetDataWrite,
  manageProtectedRanges: spreadsheetDataWrite,
  setDataValidation: spreadsheetDataWrite,
  createChart: spreadsheetDataWrite,
  createPivotTable: spreadsheetDataWrite,
  createFilterView: spreadsheetDataWrite,
  spreadsheetChanged: anyOf(
    googleSheetsScopes.spreadsheets,
    googleSheetsScopes.spreadsheetsReadonly,
    googleSheetsScopes.driveReadonly,
    googleSheetsScopes.drive,
    googleSheetsScopes.driveFile
  )
} as const;
