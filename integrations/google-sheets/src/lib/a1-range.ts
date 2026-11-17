const findA1SheetSeparator = (range: string) => {
  if (!range.startsWith("'")) {
    return range.lastIndexOf('!');
  }

  for (let i = 1; i < range.length; i += 1) {
    if (range[i] !== "'") continue;

    if (range[i + 1] === "'") {
      i += 1;
      continue;
    }

    let rest = range.slice(i + 1);
    let bangOffset = rest.search(/\s*!/);
    return bangOffset === -1 ? -1 : i + 1 + bangOffset + rest.slice(bangOffset).indexOf('!');
  }

  return -1;
};

export const quoteA1SheetName = (sheetName: string) => `'${sheetName.replaceAll("'", "''")}'`;

const isAmbiguousA1SheetName = (sheetName: string) =>
  /^[A-Za-z]{1,3}\d+$/.test(sheetName) || /^R\d+C\d+$/i.test(sheetName);

const shouldQuoteA1SheetName = (sheetName: string) =>
  !/^[A-Za-z_][A-Za-z0-9_]*$/.test(sheetName) || isAmbiguousA1SheetName(sheetName);

const columnLettersToIndex = (letters: string) =>
  [...letters.toUpperCase()].reduce((index, char) => index * 26 + char.charCodeAt(0) - 64, 0);

const columnIndexToLetters = (index: number) => {
  let letters = '';
  for (let rest = index; rest > 0; rest = Math.floor((rest - 1) / 26)) {
    letters = String.fromCharCode(65 + ((rest - 1) % 26)) + letters;
  }
  return letters;
};

// Google reports the range a read covered fully bounded (e.g. "'Tab'!A1:O35000"), and
// values[i] always maps to the i-th row (or column) of it, so the unread remainder of a
// partially returned read starts `consumed` rows (or columns) after the range start.
export const getRemainingA1Range = (
  range: string,
  consumed: number,
  majorDimension: 'ROWS' | 'COLUMNS'
) => {
  let trimmed = range.trim();
  let separatorIndex = findA1SheetSeparator(trimmed);
  let sheetPrefix = separatorIndex === -1 ? '' : `${trimmed.slice(0, separatorIndex).trim()}!`;
  let location = separatorIndex === -1 ? trimmed : trimmed.slice(separatorIndex + 1).trim();

  let match = /^\$?([A-Za-z]{1,3})\$?(\d+):\$?([A-Za-z]{1,3})\$?(\d+)$/.exec(location);
  if (!match) return undefined;

  let [startColumn, startRow, endColumn, endRow] = match.slice(1) as [
    string,
    string,
    string,
    string
  ];

  if (majorDimension === 'COLUMNS') {
    let nextColumn = columnLettersToIndex(startColumn) + consumed;
    if (nextColumn > columnLettersToIndex(endColumn)) return undefined;
    return `${sheetPrefix}${columnIndexToLetters(nextColumn)}${startRow}:${endColumn.toUpperCase()}${endRow}`;
  }

  let nextRow = Number(startRow) + consumed;
  if (nextRow > Number(endRow)) return undefined;
  return `${sheetPrefix}${startColumn.toUpperCase()}${nextRow}:${endColumn.toUpperCase()}${endRow}`;
};

export const normalizeA1Range = (range: string) => {
  let trimmed = range.trim();
  let separatorIndex = findA1SheetSeparator(trimmed);

  if (separatorIndex === -1) return trimmed;

  let sheetName = trimmed.slice(0, separatorIndex).trim();
  let location = trimmed.slice(separatorIndex + 1).trim();

  if (!sheetName || !location) return trimmed;
  if (sheetName.startsWith("'") && sheetName.endsWith("'")) return `${sheetName}!${location}`;
  if (!shouldQuoteA1SheetName(sheetName)) return `${sheetName}!${location}`;

  return `${quoteA1SheetName(sheetName)}!${location}`;
};
