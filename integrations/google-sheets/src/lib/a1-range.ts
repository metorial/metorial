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

const quoteA1SheetName = (sheetName: string) => `'${sheetName.replaceAll("'", "''")}'`;

const isAmbiguousA1SheetName = (sheetName: string) =>
  /^[A-Za-z]{1,3}\d+$/.test(sheetName) || /^R\d+C\d+$/i.test(sheetName);

const shouldQuoteA1SheetName = (sheetName: string) =>
  !/^[A-Za-z_][A-Za-z0-9_]*$/.test(sheetName) || isAmbiguousA1SheetName(sheetName);

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
