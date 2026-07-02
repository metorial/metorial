import * as domino from '@mixmark-io/domino';
import * as XLSX from 'xlsx';
import { sternFinancialDataServiceError } from './errors';
import {
  BETA_FIELDS,
  type BetaField,
  type BetaRow,
  ERP_FIELDS,
  type ErpField,
  type ErpRow,
  SOURCES,
  type SourceId,
  type SternRow
} from './sources';

type Cell = {
  text: string;
  value?: unknown;
};

type TypedValueKind = 'string' | 'integer' | 'number';
type HeaderMap<T extends string> = Record<T, number>;
type Workbook = XLSX.WorkBook;
type Mapper<TField extends string, TRow extends SternRow> = (
  cells: Cell[],
  headerMap: HeaderMap<TField>
) => TRow | null;

let HEADER_ALIASES: Record<string, readonly string[]> = {
  country: ['country'],
  moodysRating: ["moody's rating", 'moodys rating', 'moody rating'],
  adjustedDefaultSpread: [
    'adj. default spread',
    'adj default spread',
    'adjusted default spread',
    'rating-based default spread',
    'rating based default spread',
    'default spread'
  ],
  countryRiskPremium: ['country risk premium', 'crp'],
  equityRiskPremium: ['equity risk premium', 'total equity risk premium', 'erp', 'final erp'],
  corporateTaxRate: ['corporate tax rate', 'tax rate'],
  sovereignCds: [
    'sovereign cds',
    'sovereignn cds',
    'sovereign cds, net of swiss cds',
    'sovereign cds net of swiss cds'
  ],
  erpBasedOnSovereignCds: [
    'erp based on sovereign cds',
    'erp based on sovereign cdss',
    'total equity risk premium2'
  ],
  industryName: ['industry name'],
  numberOfFirms: ['number of firms'],
  beta: ['beta'],
  debtToEquityRatio: ['d/e ratio', 'de ratio', 'debt/equity ratio', 'debt to equity ratio'],
  effectiveTaxRate: ['effective tax rate'],
  unleveredBeta: ['unlevered beta'],
  cashToFirmValue: ['cash/firm value', 'cash firm value'],
  unleveredBetaCorrectedForCash: ['unlevered beta corrected for cash'],
  hiloRisk: ['hilo risk', 'hi lo risk'],
  standardDeviationOfEquity: [
    'standard deviation of equity',
    'standard deviation equity',
    'standard deviation (equity)'
  ],
  standardDeviationInOperatingIncomeLast10Years: [
    'standard deviation in operating income (last 10 years)',
    'standard deviation in operating income last 10 years',
    'standard deviation operating income'
  ]
};

let UNAVAILABLE_VALUES = new Set(['', 'na', 'n/a', 'n.a.', 'nm', 'unavailable', '-', '—']);

export let normalizeText = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value)
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

export let normalizeHeader = (value: unknown) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

let isUnavailable = (value: unknown) =>
  UNAVAILABLE_VALUES.has(normalizeText(value).toLowerCase());

let coerceNumberText = (value: unknown) =>
  normalizeText(value).replace(/[%,$]/g, '').replace(/,/g, '').replace(/[()]/g, '').trim();

let cleanNumber = (value: number) =>
  Number.isFinite(value) ? Number(value.toFixed(12)) : null;

export let parseTypedValue = (
  text: unknown,
  rawValue: unknown,
  kind: TypedValueKind
): string | number | null => {
  let normalized = normalizeText(text);

  if (isUnavailable(normalized)) {
    return null;
  }

  if (kind === 'string') {
    return normalized || null;
  }

  if (kind === 'integer') {
    if (typeof rawValue === 'number' && !/%/.test(normalized)) {
      return Math.round(rawValue);
    }

    let intValue = Number.parseInt(coerceNumberText(normalized), 10);
    return Number.isFinite(intValue) ? intValue : null;
  }

  if (/%/.test(normalized)) {
    let percentValue = Number.parseFloat(coerceNumberText(normalized));
    return cleanNumber(percentValue / 100);
  }

  if (typeof rawValue === 'number') {
    return cleanNumber(rawValue);
  }

  let numberValue = Number.parseFloat(coerceNumberText(normalized));
  return cleanNumber(numberValue);
};

let parseStringValue = (text: unknown, rawValue: unknown) =>
  parseTypedValue(text, rawValue, 'string') as string | null;

let parseNumberValue = (text: unknown, rawValue: unknown) =>
  parseTypedValue(text, rawValue, 'number') as number | null;

let parseIntegerValue = (text: unknown, rawValue: unknown) =>
  parseTypedValue(text, rawValue, 'integer') as number | null;

let compileAliases = (field: string) =>
  (HEADER_ALIASES[field] ?? [field]).map(normalizeHeader);

let headerMatchesField = (header: string, field: string) =>
  compileAliases(field).includes(normalizeHeader(header));

export let findHeaderMap = <T extends string>(
  headers: readonly string[],
  requiredFields: readonly T[]
) => {
  let map: Partial<Record<T, number>> = {};

  headers.forEach((header, index) => {
    for (let field of requiredFields) {
      if (map[field] === undefined && headerMatchesField(header, field)) {
        map[field] = index;
      }
    }
  });

  let missing = requiredFields.filter(field => map[field] === undefined);
  return missing.length > 0 ? null : (map as HeaderMap<T>);
};

let hasAnyContent = (cells: readonly Cell[]) => cells.some(cell => normalizeText(cell.text));

let trimTrailingEmptyCells = (cells: Cell[]) => {
  let end = cells.length;

  while (end > 0 && !normalizeText(cells[end - 1]?.text)) {
    end -= 1;
  }

  return cells.slice(0, end);
};

let cellAt = (cells: readonly Cell[], index: number) =>
  index >= 0 ? cells[index] : undefined;

let getRawValue = (cells: readonly Cell[], index: number) => cellAt(cells, index)?.value;

let makeRaw = <T extends string>(
  fields: readonly T[],
  cells: readonly Cell[],
  headerMap: HeaderMap<T>
) =>
  fields.reduce(
    (raw, field) => {
      raw[field] = normalizeText(cellAt(cells, headerMap[field])?.text);
      return raw;
    },
    {} as Record<T, string>
  );

let mapErpRow = (cells: Cell[], headerMap: HeaderMap<ErpField>): ErpRow | null => {
  let raw = makeRaw(ERP_FIELDS, cells, headerMap);
  let country = raw.country;

  if (!country || /^country$/i.test(country) || /^frontier markets/i.test(country)) {
    return null;
  }

  return {
    country: parseStringValue(raw.country, getRawValue(cells, headerMap.country)) ?? country,
    moodysRating: parseStringValue(
      raw.moodysRating,
      getRawValue(cells, headerMap.moodysRating)
    ),
    adjustedDefaultSpread: parseNumberValue(
      raw.adjustedDefaultSpread,
      getRawValue(cells, headerMap.adjustedDefaultSpread)
    ),
    countryRiskPremium: parseNumberValue(
      raw.countryRiskPremium,
      getRawValue(cells, headerMap.countryRiskPremium)
    ),
    equityRiskPremium: parseNumberValue(
      raw.equityRiskPremium,
      getRawValue(cells, headerMap.equityRiskPremium)
    ),
    corporateTaxRate: parseNumberValue(
      raw.corporateTaxRate,
      getRawValue(cells, headerMap.corporateTaxRate)
    ),
    sovereignCds: parseNumberValue(
      raw.sovereignCds,
      getRawValue(cells, headerMap.sovereignCds)
    ),
    erpBasedOnSovereignCds: parseNumberValue(
      raw.erpBasedOnSovereignCds,
      getRawValue(cells, headerMap.erpBasedOnSovereignCds)
    ),
    raw
  };
};

export let classifyBetaRow = (industryName: string) =>
  /^total market/i.test(normalizeText(industryName)) ? 'aggregate' : 'industry';

let mapBetaRow = (cells: Cell[], headerMap: HeaderMap<BetaField>): BetaRow | null => {
  let raw = makeRaw(BETA_FIELDS, cells, headerMap);
  let industryName = raw.industryName;

  if (!industryName || /^industry name$/i.test(industryName)) {
    return null;
  }

  return {
    industryName:
      parseStringValue(raw.industryName, getRawValue(cells, headerMap.industryName)) ??
      industryName,
    numberOfFirms: parseIntegerValue(
      raw.numberOfFirms,
      getRawValue(cells, headerMap.numberOfFirms)
    ),
    beta: parseNumberValue(raw.beta, getRawValue(cells, headerMap.beta)),
    debtToEquityRatio: parseNumberValue(
      raw.debtToEquityRatio,
      getRawValue(cells, headerMap.debtToEquityRatio)
    ),
    effectiveTaxRate: parseNumberValue(
      raw.effectiveTaxRate,
      getRawValue(cells, headerMap.effectiveTaxRate)
    ),
    unleveredBeta: parseNumberValue(
      raw.unleveredBeta,
      getRawValue(cells, headerMap.unleveredBeta)
    ),
    cashToFirmValue: parseNumberValue(
      raw.cashToFirmValue,
      getRawValue(cells, headerMap.cashToFirmValue)
    ),
    unleveredBetaCorrectedForCash: parseNumberValue(
      raw.unleveredBetaCorrectedForCash,
      getRawValue(cells, headerMap.unleveredBetaCorrectedForCash)
    ),
    hiloRisk: parseNumberValue(raw.hiloRisk, getRawValue(cells, headerMap.hiloRisk)),
    standardDeviationOfEquity: parseNumberValue(
      raw.standardDeviationOfEquity,
      getRawValue(cells, headerMap.standardDeviationOfEquity)
    ),
    standardDeviationInOperatingIncomeLast10Years: parseNumberValue(
      raw.standardDeviationInOperatingIncomeLast10Years,
      getRawValue(cells, headerMap.standardDeviationInOperatingIncomeLast10Years)
    ),
    rowType: classifyBetaRow(industryName),
    raw
  };
};

let makeCell = (text: unknown, value?: unknown): Cell => ({
  text: normalizeText(text),
  value
});

let sheetRows = (sheet: XLSX.WorkSheet | undefined) => {
  if (!sheet?.['!ref']) {
    return [];
  }

  let range = XLSX.utils.decode_range(sheet['!ref']);
  let rows: Cell[][] = [];

  for (let rowIndex = range.s.r; rowIndex <= range.e.r; rowIndex += 1) {
    let cells: Cell[] = [];

    for (let colIndex = range.s.c; colIndex <= range.e.c; colIndex += 1) {
      let address = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
      let cell = sheet[address];

      cells.push(makeCell(cell ? (cell.w !== undefined ? cell.w : cell.v) : '', cell?.v));
    }

    cells = trimTrailingEmptyCells(cells);

    if (hasAnyContent(cells)) {
      rows.push(cells);
    }
  }

  return rows;
};

export let parseWorkbook = (buffer: Buffer) =>
  XLSX.read(buffer, { type: 'buffer', cellDates: true, cellNF: true });

let findTableInRows = <T extends string>(
  rows: Cell[][],
  requiredFields: readonly T[]
): { rows: Cell[][]; headerIndex: number; headerMap: HeaderMap<T> } | null => {
  for (let index = 0; index < rows.length; index += 1) {
    let headers = rows[index]?.map(cell => cell.text) ?? [];
    let headerMap = findHeaderMap(headers, requiredFields);

    if (headerMap) {
      return {
        rows,
        headerIndex: index,
        headerMap
      };
    }
  }

  return null;
};

let findWorkbookTable = <T extends string>(
  workbook: Workbook,
  requiredFields: readonly T[]
) => {
  for (let sheetName of workbook.SheetNames) {
    let rows = sheetRows(workbook.Sheets[sheetName]);
    let table = findTableInRows(rows, requiredFields);

    if (table) {
      return {
        ...table,
        sheetName
      };
    }
  }

  return null;
};

let parseRowsAfterHeader = <TField extends string, TRow extends SternRow>(
  rows: Cell[][],
  headerIndex: number,
  headerMap: HeaderMap<TField>,
  mapper: Mapper<TField, TRow>
) => {
  let parsed: TRow[] = [];

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    let cells = rows[index] ?? [];
    let firstCell = normalizeText(cells[0]?.text);

    if (!firstCell) {
      break;
    }

    let row = mapper(cells, headerMap);

    if (row) {
      parsed.push(row);
    }
  }

  return parsed;
};

export let extractBetaRowsFromWorkbook = (workbook: Workbook) => {
  let table = findWorkbookTable(workbook, BETA_FIELDS);

  if (!table) {
    throw sternFinancialDataServiceError('Could not find beta table in workbook.');
  }

  return parseRowsAfterHeader(table.rows, table.headerIndex, table.headerMap, mapBetaRow);
};

let extractErpCountryRowsFromWorkbook = (workbook: Workbook) => {
  let required = [
    'country',
    'moodysRating',
    'adjustedDefaultSpread',
    'countryRiskPremium',
    'equityRiskPremium',
    'sovereignCds',
    'erpBasedOnSovereignCds'
  ] as const;
  let table = findWorkbookTable(workbook, required);

  if (!table) {
    throw sternFinancialDataServiceError('Could not find country ERP table in workbook.');
  }

  let headerMap = {
    ...table.headerMap,
    corporateTaxRate: -1
  } satisfies HeaderMap<ErpField>;

  let rows: ErpRow[] = [];

  for (let index = table.headerIndex + 1; index < table.rows.length; index += 1) {
    let cells = table.rows[index] ?? [];
    let country = normalizeText(cellAt(cells, headerMap.country)?.text);

    if (!country || /^frontier markets/i.test(country)) {
      break;
    }

    let row = mapErpRow(cells, headerMap);

    if (row) {
      rows.push(row);
    }
  }

  return rows;
};

let findFrontierTable = (workbook: Workbook) => {
  for (let sheetName of workbook.SheetNames) {
    let rows = sheetRows(workbook.Sheets[sheetName]);

    for (let index = 0; index < rows.length; index += 1) {
      let headers = rows[index]?.map(cell => cell.text) ?? [];
      let normalizedHeaders = headers.map(normalizeHeader);
      let prsIndex = normalizedHeaders.indexOf('prs composite risk score');

      if (prsIndex === -1) {
        continue;
      }

      let headerMap = findHeaderMap(headers, [
        'country',
        'equityRiskPremium',
        'countryRiskPremium',
        'adjustedDefaultSpread'
      ] as const);

      if (headerMap) {
        return {
          rows,
          headerIndex: index,
          headerMap
        };
      }
    }
  }

  return null;
};

let extractErpFrontierRowsFromWorkbook = (workbook: Workbook) => {
  let table = findFrontierTable(workbook);

  if (!table) {
    return [];
  }

  let rows: ErpRow[] = [];

  for (let index = table.headerIndex + 1; index < table.rows.length; index += 1) {
    let cells = table.rows[index] ?? [];
    let country = normalizeText(cellAt(cells, table.headerMap.country)?.text);

    if (!country) {
      break;
    }

    let adjustedDefaultSpreadCell = cellAt(cells, table.headerMap.adjustedDefaultSpread);
    let countryRiskPremiumCell = cellAt(cells, table.headerMap.countryRiskPremium);
    let equityRiskPremiumCell = cellAt(cells, table.headerMap.equityRiskPremium);

    rows.push({
      country,
      moodysRating: 'NR',
      adjustedDefaultSpread: parseNumberValue(
        adjustedDefaultSpreadCell?.text,
        adjustedDefaultSpreadCell?.value
      ),
      countryRiskPremium: parseNumberValue(
        countryRiskPremiumCell?.text,
        countryRiskPremiumCell?.value
      ),
      equityRiskPremium: parseNumberValue(
        equityRiskPremiumCell?.text,
        equityRiskPremiumCell?.value
      ),
      corporateTaxRate: null,
      sovereignCds: null,
      erpBasedOnSovereignCds: null,
      raw: {
        country,
        moodysRating: 'NR',
        adjustedDefaultSpread: normalizeText(adjustedDefaultSpreadCell?.text),
        countryRiskPremium: normalizeText(countryRiskPremiumCell?.text),
        equityRiskPremium: normalizeText(equityRiskPremiumCell?.text),
        corporateTaxRate: '',
        sovereignCds: '',
        erpBasedOnSovereignCds: ''
      }
    });
  }

  return rows;
};

let extractCountryTaxRatesFromWorkbook = (workbook: Workbook) => {
  let taxByCountry: Record<string, Cell> = {};
  let sheet = workbook.Sheets['PRS Worksheet'] ?? workbook.Sheets['Country Tax Rates'];

  if (!sheet) {
    return taxByCountry;
  }

  let rows = sheetRows(sheet);
  let headerMap: HeaderMap<'country' | 'corporateTaxRate'> | null = null;
  let headerIndex = -1;

  for (let index = 0; index < rows.length; index += 1) {
    headerMap = findHeaderMap(rows[index]?.map(cell => cell.text) ?? [], [
      'country',
      'corporateTaxRate'
    ] as const);

    if (headerMap) {
      headerIndex = index;
      break;
    }
  }

  if (!headerMap) {
    return taxByCountry;
  }

  for (let rowIndex = headerIndex + 1; rowIndex < rows.length; rowIndex += 1) {
    let cells = rows[rowIndex] ?? [];
    let countryCell = cellAt(cells, headerMap.country);
    let taxCell = cellAt(cells, headerMap.corporateTaxRate);
    let country = normalizeText(countryCell?.text);

    if (!country) {
      continue;
    }

    taxByCountry[country] = taxCell ?? makeCell('', undefined);
  }

  return taxByCountry;
};

export let extractErpRowsFromWorkbook = (workbook: Workbook) => {
  let erpRows = extractErpCountryRowsFromWorkbook(workbook);
  let frontierRows = extractErpFrontierRowsFromWorkbook(workbook);
  let taxByCountry = extractCountryTaxRatesFromWorkbook(workbook);
  let rows = erpRows.concat(frontierRows).map(row => {
    let tax = taxByCountry[row.country];

    if (tax) {
      row.corporateTaxRate = parseNumberValue(tax.text, tax.value);
      row.raw.corporateTaxRate = normalizeText(tax.text);
    }

    return row;
  });

  if (rows.length === 0) {
    throw sternFinancialDataServiceError('Could not find ERP rows in workbook.');
  }

  return rows;
};

let removeNode = (node: any) => {
  if (node?.parentNode) {
    node.parentNode.removeChild(node);
  }
};

let removeComments = (node: any) => {
  let child = node?.firstChild;

  while (child) {
    let next = child.nextSibling;

    if (child.nodeType === 8) {
      removeNode(child);
    } else {
      removeComments(child);
    }

    child = next;
  }
};

let isHidden = (element: any) => {
  let current = element;

  while (current?.getAttribute) {
    let style = String(current.getAttribute('style') ?? '').toLowerCase();

    if (
      current.hasAttribute?.('hidden') ||
      /display\s*:\s*none/.test(style) ||
      /visibility\s*:\s*hidden/.test(style)
    ) {
      return true;
    }

    current = current.parentNode;
  }

  return false;
};

let toArray = <T = any>(list: ArrayLike<T> | null | undefined) => Array.from(list ?? []);

let cleanDocument = (html: string) => {
  let window = domino.createWindow(html);
  let document = window.document;

  toArray(
    document.querySelectorAll('script, style, noscript, link, meta, title, colgroup, col')
  ).forEach(removeNode);
  removeComments(document);

  return document;
};

let tableRowsFromHtml = (html: string) => {
  let document = cleanDocument(html);
  let tables = toArray(document.querySelectorAll('table'));

  return tables.map((table: any) =>
    toArray(table.querySelectorAll('tr'))
      .filter((row: any) => !isHidden(row))
      .map((row: any) =>
        trimTrailingEmptyCells(
          toArray(row.querySelectorAll('th,td'))
            .filter((cell: any) => !isHidden(cell))
            .map((cell: any) => makeCell(cell.textContent, undefined))
        )
      )
      .filter(hasAnyContent)
  );
};

let extractRowsFromHtml = <TField extends string, TRow extends SternRow>(
  html: string,
  requiredFields: readonly TField[],
  mapper: Mapper<TField, TRow>
) => {
  let tables = tableRowsFromHtml(html);

  for (let tableRows of tables) {
    let table = findTableInRows(tableRows, requiredFields);

    if (table) {
      return parseRowsAfterHeader(table.rows, table.headerIndex, table.headerMap, mapper);
    }
  }

  throw sternFinancialDataServiceError('Could not find matching table in HTML.');
};

export let extractErpRowsFromHtml = (html: string) =>
  extractRowsFromHtml(html, ERP_FIELDS, mapErpRow);

export let extractBetaRowsFromHtml = (html: string) =>
  extractRowsFromHtml(html, BETA_FIELDS, mapBetaRow);

export let extractRowsForSource = (
  sourceId: SourceId,
  workbook: Workbook | null,
  html: string
) => {
  let source = SOURCES[sourceId];

  if (source.kind === 'erp') {
    return workbook ? extractErpRowsFromWorkbook(workbook) : extractErpRowsFromHtml(html);
  }

  return workbook ? extractBetaRowsFromWorkbook(workbook) : extractBetaRowsFromHtml(html);
};
