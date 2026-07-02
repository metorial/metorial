import { Buffer } from 'node:buffer';
import { createBase64Attachment, createTextAttachment, SlateTool } from 'slates';
import { z } from 'zod';
import { SsbClient, type TableQuery, type TableSelection } from '../lib/client';
import { ssbServiceError } from '../lib/errors';
import { summarizeJsonData } from '../lib/metadata';
import { spec } from '../spec';

const MAX_EXTRACT_CELL_COUNT = 800_000;

let languageSchema = z.enum(['en', 'no']);

let outputFormatSchema = z.enum(['json-stat2', 'json-px', 'csv', 'xlsx', 'html', 'px']);

let outputFormatParamSchema = z.enum([
  'UseCodes',
  'UseTexts',
  'UseCodesAndTexts',
  'IncludeTitle',
  'SeparatorTab',
  'SeparatorSpace',
  'SeparatorSemicolon',
  'ExcludeZerosAndMissingValues'
]);

let selectionSchema = z.object({
  variableCode: z
    .string()
    .describe('Table variable code from get_tables action=get_metadata, for example Tid.'),
  valueCodes: z
    .array(z.string())
    .min(1)
    .describe(
      'Value codes from metadata, or SSB expressions such as *, ??, top(3), from(2024), to(2024), or [range(a,b)]. When selection is non-empty, include every non-eliminable table variable.'
    ),
  codelist: z
    .string()
    .optional()
    .describe('Optional codelist or grouping id to apply for this variable.'),
  outputValues: z
    .enum(['aggregated', 'single'])
    .optional()
    .describe(
      'For grouping codelists, choose aggregated group values or matching single values.'
    )
});

let placementSchema = z.object({
  heading: z
    .array(z.string())
    .optional()
    .describe('Variables to place in the table heading for csv, xlsx, html, or px output.'),
  stub: z
    .array(z.string())
    .optional()
    .describe('Variables to place in the table stub for csv, xlsx, html, or px output.')
});

let fallbackMimeType = (format: z.infer<typeof outputFormatSchema>) => {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'html':
      return 'text/html';
    case 'px':
      return 'text/plain';
    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'json-px':
    case 'json-stat2':
      return 'application/json';
  }
};

let normalizeContentType = (
  contentType: string | undefined,
  format: z.infer<typeof outputFormatSchema>
) => {
  if (!contentType) return fallbackMimeType(format);

  return contentType.split(';')[0]?.trim() || fallbackMimeType(format);
};

let isJsonOutput = (format: z.infer<typeof outputFormatSchema>) =>
  format === 'json-stat2' || format === 'json-px';

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let asStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

let asNumberArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is number => typeof item === 'number') : [];

type MetadataDimension = {
  id: string;
  elimination: boolean;
  codes: string[];
  valueCount: number;
  indexByCode: Map<string, number>;
};

let parseMetadataDimensions = (metadata: unknown): MetadataDimension[] => {
  if (!isRecord(metadata)) return [];

  let dimensionIds = asStringArray(metadata.id);
  let sizes = asNumberArray(metadata.size);
  let dimensions = isRecord(metadata.dimension) ? metadata.dimension : {};

  return dimensionIds.map((dimensionId, index) => {
    let item = isRecord(dimensions[dimensionId]) ? dimensions[dimensionId] : {};
    let category = isRecord(item.category) ? item.category : {};
    let categoryIndexes = isRecord(category.index) ? category.index : {};
    let extension = isRecord(item.extension) ? item.extension : {};
    let orderedCodes = Object.entries(categoryIndexes)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
      .sort(([, left], [, right]) => left - right)
      .map(([code]) => code);

    return {
      id: dimensionId,
      elimination: extension.elimination === true,
      codes: orderedCodes,
      valueCount: orderedCodes.length || sizes[index] || 0,
      indexByCode: new Map(orderedCodes.map((code, codeIndex) => [code, codeIndex]))
    };
  });
};

let parseCountExpression = (
  expression: string,
  dimension: MetadataDimension
): number | null => {
  let trimmed = expression.trim();
  let total = dimension.valueCount;

  if (!trimmed || trimmed === '*' || trimmed.includes('?')) return total;

  let topMatch = /^top\((\d+)\)$/i.exec(trimmed);
  if (topMatch) return Math.min(Number(topMatch[1]), total);

  let bottomMatch = /^bottom\((\d+)\)$/i.exec(trimmed);
  if (bottomMatch) return Math.min(Number(bottomMatch[1]), total);

  let fromMatch = /^from\((.+)\)$/i.exec(trimmed);
  if (fromMatch) {
    let startIndex = dimension.indexByCode.get(fromMatch[1]!.trim());
    return startIndex === undefined ? total : Math.max(total - startIndex, 0);
  }

  let toMatch = /^to\((.+)\)$/i.exec(trimmed);
  if (toMatch) {
    let endIndex = dimension.indexByCode.get(toMatch[1]!.trim());
    return endIndex === undefined ? total : Math.min(endIndex + 1, total);
  }

  let rangeMatch = /^\[range\((.+),(.+)\)\]$/i.exec(trimmed);
  if (rangeMatch) {
    let startIndex = dimension.indexByCode.get(rangeMatch[1]!.trim());
    let endIndex = dimension.indexByCode.get(rangeMatch[2]!.trim());
    if (startIndex === undefined || endIndex === undefined) return total;
    return Math.max(endIndex - startIndex + 1, 0);
  }

  return null;
};

let parseValueCodeExpression = (
  expression: string,
  dimension: MetadataDimension
): string[] | null => {
  let trimmed = expression.trim();
  let total = dimension.codes.length;

  if (!trimmed || trimmed === '*' || trimmed.includes('?')) return null;

  let topMatch = /^top\((\d+)\)$/i.exec(trimmed);
  if (topMatch) return dimension.codes.slice(0, Number(topMatch[1]));

  let bottomMatch = /^bottom\((\d+)\)$/i.exec(trimmed);
  if (bottomMatch) return dimension.codes.slice(Math.max(total - Number(bottomMatch[1]), 0));

  let fromMatch = /^from\((.+)\)$/i.exec(trimmed);
  if (fromMatch) {
    let startCode = fromMatch[1]!.trim();
    let startIndex = dimension.indexByCode.get(startCode);
    if (startIndex === undefined) {
      throw ssbServiceError(
        `Cannot expand from(${startCode}) for variable ${dimension.id}; ${startCode} is not a metadata value code.`
      );
    }
    return dimension.codes.slice(startIndex);
  }

  let toMatch = /^to\((.+)\)$/i.exec(trimmed);
  if (toMatch) {
    let endCode = toMatch[1]!.trim();
    let endIndex = dimension.indexByCode.get(endCode);
    if (endIndex === undefined) {
      throw ssbServiceError(
        `Cannot expand to(${endCode}) for variable ${dimension.id}; ${endCode} is not a metadata value code.`
      );
    }
    return dimension.codes.slice(0, endIndex + 1);
  }

  let rangeMatch = /^\[range\((.+),(.+)\)\]$/i.exec(trimmed);
  if (rangeMatch) {
    let startCode = rangeMatch[1]!.trim();
    let endCode = rangeMatch[2]!.trim();
    let startIndex = dimension.indexByCode.get(startCode);
    let endIndex = dimension.indexByCode.get(endCode);
    if (startIndex === undefined || endIndex === undefined) {
      throw ssbServiceError(
        `Cannot expand [range(${startCode},${endCode})] for variable ${dimension.id}; both endpoints must be metadata value codes.`
      );
    }
    if (startIndex > endIndex) {
      throw ssbServiceError(
        `Cannot expand [range(${startCode},${endCode})] for variable ${dimension.id}; the start value must come before the end value in metadata order.`
      );
    }
    return dimension.codes.slice(startIndex, endIndex + 1);
  }

  return null;
};

let estimateSelectedValueCount = (selection: TableSelection, dimension: MetadataDimension) => {
  let total = dimension.valueCount;
  let knownCodes = new Set<string>();
  let expressionCount = 0;

  for (let valueCode of selection.valueCodes) {
    let expressionValueCount = parseCountExpression(valueCode, dimension);
    if (expressionValueCount !== null) {
      expressionCount += expressionValueCount;
      continue;
    }

    knownCodes.add(valueCode);
  }

  return Math.max(
    1,
    Math.min(total || selection.valueCodes.length, knownCodes.size + expressionCount)
  );
};

let expandSelectionValueCodes = (
  selection: TableSelection,
  dimension: MetadataDimension
): string[] => {
  let expandedCodes: string[] = [];
  let seenCodes = new Set<string>();

  for (let valueCode of selection.valueCodes) {
    let expandedExpression = parseValueCodeExpression(valueCode, dimension);
    let values = expandedExpression ?? [valueCode];

    for (let value of values) {
      if (!seenCodes.has(value)) {
        seenCodes.add(value);
        expandedCodes.push(value);
      }
    }
  }

  return expandedCodes;
};

let expandQuerySelectionExpressions = (
  selection: TableSelection[] | undefined,
  dimensionsById: Map<string, MetadataDimension>
): TableSelection[] | undefined =>
  selection?.map(item => {
    let dimension = dimensionsById.get(item.variableCode);
    if (!dimension) return item;

    return {
      ...item,
      valueCodes: expandSelectionValueCodes(item, dimension)
    };
  });

let formatVariables = (variables: string[]) =>
  variables.map(variable => `\`${variable}\``).join(', ');

export let validateQuerySelectionAgainstMetadata = (
  query: Pick<TableQuery, 'tableId' | 'selection'>,
  metadata: unknown
) => {
  if (!query.selection || query.selection.length === 0) {
    return { cellCount: undefined as number | undefined };
  }

  let dimensions = parseMetadataDimensions(metadata);
  if (dimensions.length === 0) {
    throw ssbServiceError(
      `Could not inspect metadata for SSB table ${query.tableId}. Call get_tables with action="get_metadata" first and retry with explicit variableCode/valueCodes selections.`
    );
  }

  let dimensionsById = new Map(dimensions.map(dimension => [dimension.id, dimension]));
  let selectionsByVariable = new Map<string, TableSelection>();
  let duplicateVariables: string[] = [];
  let unknownVariables: string[] = [];

  for (let selection of query.selection) {
    if (selectionsByVariable.has(selection.variableCode)) {
      duplicateVariables.push(selection.variableCode);
      continue;
    }
    if (!dimensionsById.has(selection.variableCode)) {
      unknownVariables.push(selection.variableCode);
      continue;
    }
    selectionsByVariable.set(selection.variableCode, selection);
  }

  if (duplicateVariables.length > 0) {
    throw ssbServiceError(
      `Each SSB variable can only appear once in query_table.selection. Duplicate variables: ${formatVariables(duplicateVariables)}.`
    );
  }

  if (unknownVariables.length > 0) {
    throw ssbServiceError(
      `Unknown SSB variableCode for table ${query.tableId}: ${formatVariables(unknownVariables)}. Call get_tables with action="get_metadata" to discover valid variable codes.`
    );
  }

  let missingRequiredVariables = dimensions
    .filter(dimension => !dimension.elimination && !selectionsByVariable.has(dimension.id))
    .map(dimension => dimension.id);

  if (missingRequiredVariables.length > 0) {
    throw ssbServiceError(
      `Non-empty SSB selections must include every non-eliminable variable for table ${query.tableId}. Missing variables: ${formatVariables(missingRequiredVariables)}. Call get_tables with action="get_metadata" to inspect dimensions, or omit selection entirely / pass selection=[] to use SSB defaults.`
    );
  }

  let factors = dimensions.map(dimension => {
    let selection = selectionsByVariable.get(dimension.id);
    return {
      variableCode: dimension.id,
      valueCount: selection ? estimateSelectedValueCount(selection, dimension) : 1
    };
  });
  let cellCount = factors.reduce((product, factor) => product * factor.valueCount, 1);

  if (cellCount > MAX_EXTRACT_CELL_COUNT) {
    let widestVariables = [...factors]
      .sort((left, right) => right.valueCount - left.valueCount)
      .slice(0, 3)
      .map(factor => `${factor.variableCode}=${factor.valueCount}`)
      .join(', ');

    throw ssbServiceError(
      `SSB limits each table extract to ${MAX_EXTRACT_CELL_COUNT.toLocaleString('en-US')} cells; this selection is estimated at ${cellCount.toLocaleString('en-US')} cells. Batch or narrow the widest variables (${widestVariables}) using valueCodes, top(n), from(value), to(value), or [range(from,to)].`
    );
  }

  return { cellCount };
};

let preflightQuerySelection = async (client: SsbClient, query: TableQuery) => {
  if (!query.selection || query.selection.length === 0) return {};

  let metadata = await client.getMetadata({
    tableId: query.tableId,
    language: query.language,
    codelists: query.selection
      .filter(selection => selection.codelist)
      .map(selection => ({
        variableCode: selection.variableCode,
        codelistId: selection.codelist!
      }))
  });

  validateQuerySelectionAgainstMetadata(query, metadata);
  let dimensions = parseMetadataDimensions(metadata);
  let dimensionsById = new Map(dimensions.map(dimension => [dimension.id, dimension]));

  return {
    selection: expandQuerySelectionExpressions(query.selection, dimensionsById)
  };
};

let validateOutputParams = (
  outputFormat: z.infer<typeof outputFormatSchema>,
  outputFormatParams: z.infer<typeof outputFormatParamSchema>[]
) => {
  let presentationParams = ['UseCodes', 'UseTexts', 'UseCodesAndTexts'];
  let separatorParams = ['SeparatorTab', 'SeparatorSpace', 'SeparatorSemicolon'];

  let selectedPresentation = outputFormatParams.filter(param =>
    presentationParams.includes(param)
  );
  if (selectedPresentation.length > 1) {
    throw ssbServiceError('Use only one of UseCodes, UseTexts, or UseCodesAndTexts.');
  }

  let selectedSeparators = outputFormatParams.filter(param => separatorParams.includes(param));
  if (selectedSeparators.length > 1) {
    throw ssbServiceError('Use only one CSV separator outputFormatParam.');
  }

  if (
    outputFormatParams.some(
      param => presentationParams.includes(param) || param === 'IncludeTitle'
    ) &&
    !['csv', 'xlsx', 'html'].includes(outputFormat)
  ) {
    throw ssbServiceError(
      'UseCodes, UseTexts, UseCodesAndTexts, and IncludeTitle only apply to csv, xlsx, or html output.'
    );
  }

  if (selectedSeparators.length > 0 && outputFormat !== 'csv') {
    throw ssbServiceError('CSV separator outputFormatParams only apply to csv output.');
  }
};

export let queryTable = SlateTool.create(spec, {
  name: 'Query Table',
  key: 'query_table',
  description:
    'Retrieve Statbank Norway - SSB table data with PxWebApi v2 selections and return JSON or file-format attachments. If selection is omitted or selection=[] is passed, SSB applies the table default selection. If selection is non-empty, include every non-eliminable variable from get_tables action=get_metadata; partial selections are rejected before calling SSB. Each extract is capped at 800,000 cells, so batch wide pulls by region, time, age, or another large dimension.',
  instructions: [
    'Call get_tables with action=get_metadata first to discover variableCode, valueCodes, elimination flags, value counts, and codelists.',
    'Omit selection or pass selection=[] only when you want SSB defaults; otherwise provide a selection entry for every variable where elimination is not true.',
    'Variables marked elimination=true can be omitted from a non-empty selection; time and ContentsCode are usually not eliminable.',
    'Keep estimated cells at or below 800,000. For wide pulls, batch by a large dimension rather than retrying one huge request.',
    'Use POST unless you specifically need a shareable GET-style query URL.',
    'Use top(n), from(value), to(value), [range(from,to)], *, and ? expressions to keep selections robust.'
  ],
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      tableId: z.string().describe('Five digit SSB Statbank table id.'),
      language: languageSchema.optional().default('en').describe('Response language.'),
      method: z
        .enum(['post', 'get'])
        .optional()
        .default('post')
        .describe('HTTP method. POST is preferred for larger selections.'),
      selection: z
        .array(selectionSchema)
        .optional()
        .describe(
          'Table selections. Omit or pass [] to use SSB defaults. If non-empty, include every non-eliminable variable from get_tables action=get_metadata; partial selections fail. Batch large selections to stay under 800,000 cells.'
        ),
      outputFormat: outputFormatSchema
        .optional()
        .default('json-stat2')
        .describe('Desired SSB output format.'),
      outputFormatParams: z
        .array(outputFormatParamSchema)
        .optional()
        .default([])
        .describe('Output formatting parameters for csv, xlsx, and html outputs.'),
      placement: placementSchema
        .optional()
        .describe('Heading and stub placement for table-like outputs.')
    })
  )
  .output(
    z.object({
      tableId: z.string().describe('Queried table id.'),
      language: z.string().describe('Response language.'),
      method: z.string().describe('HTTP method used.'),
      outputFormat: z.string().describe('SSB output format.'),
      contentType: z
        .string()
        .optional()
        .describe('MIME type returned as metadata or attachment MIME.'),
      attachmentCount: z.number().describe('Number of Slate attachments returned.'),
      label: z.string().optional().describe('JSON dataset label, when available.'),
      source: z.string().optional().describe('JSON dataset source, when available.'),
      updated: z
        .string()
        .optional()
        .describe('JSON dataset updated timestamp, when available.'),
      dimensions: z
        .array(z.string())
        .optional()
        .describe('JSON dataset dimension ids, when available.'),
      cellCount: z
        .number()
        .optional()
        .describe('Calculated number of selected cells for JSON output.'),
      valueCount: z.number().optional().describe('Number of values in JSON output.'),
      data: z.any().optional().describe('Raw JSON data for json-stat2 or json-px output.')
    })
  )
  .handleInvocation(async ctx => {
    validateOutputParams(ctx.input.outputFormat, ctx.input.outputFormatParams);

    let client = new SsbClient();
    let preflight = await preflightQuerySelection(client, {
      tableId: ctx.input.tableId,
      language: ctx.input.language,
      method: ctx.input.method,
      selection: ctx.input.selection,
      outputFormat: ctx.input.outputFormat,
      outputFormatParams: ctx.input.outputFormatParams,
      placement: ctx.input.placement
    });
    let selection = preflight.selection ?? ctx.input.selection;

    let result = await client.queryTable({
      tableId: ctx.input.tableId,
      language: ctx.input.language,
      method: ctx.input.method,
      selection,
      outputFormat: ctx.input.outputFormat,
      outputFormatParams: ctx.input.outputFormatParams,
      placement: ctx.input.placement
    });
    let contentType = normalizeContentType(result.contentType, ctx.input.outputFormat);

    if (isJsonOutput(ctx.input.outputFormat)) {
      let summary = summarizeJsonData(result.data);

      return {
        output: {
          tableId: ctx.input.tableId,
          language: ctx.input.language,
          method: ctx.input.method,
          outputFormat: ctx.input.outputFormat,
          contentType,
          attachmentCount: 0,
          ...summary,
          data: result.data
        },
        message: `Retrieved **${ctx.input.outputFormat}** data for SSB table **${ctx.input.tableId}**.`
      };
    }

    if (ctx.input.outputFormat === 'xlsx') {
      let content =
        typeof result.data === 'string'
          ? Buffer.from(result.data).toString('base64')
          : Buffer.from(result.data as ArrayBuffer).toString('base64');

      return {
        output: {
          tableId: ctx.input.tableId,
          language: ctx.input.language,
          method: ctx.input.method,
          outputFormat: ctx.input.outputFormat,
          contentType,
          attachmentCount: 1
        },
        message: `Retrieved **xlsx** data for SSB table **${ctx.input.tableId}** as an attachment.`,
        attachments: [createBase64Attachment(content, contentType)]
      };
    }

    let textContent =
      typeof result.data === 'string'
        ? result.data
        : Buffer.from(result.data as ArrayBuffer).toString('utf8');

    return {
      output: {
        tableId: ctx.input.tableId,
        language: ctx.input.language,
        method: ctx.input.method,
        outputFormat: ctx.input.outputFormat,
        contentType,
        attachmentCount: 1
      },
      message: `Retrieved **${ctx.input.outputFormat}** data for SSB table **${ctx.input.tableId}** as an attachment.`,
      attachments: [createTextAttachment(textContent, contentType)]
    };
  })
  .build();
