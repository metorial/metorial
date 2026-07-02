export type TableSummary = {
  id?: string;
  label?: string;
  description?: string;
  updated?: string;
  firstPeriod?: string;
  lastPeriod?: string;
  variableNames?: string[];
  discontinued?: boolean | null;
  source?: string;
  subjectCode?: string;
  timeUnit?: string;
  pathLabels?: string[][];
};

type JsonRecord = Record<string, unknown>;

let isRecord = (value: unknown): value is JsonRecord =>
  typeof value === 'object' && value !== null;

let stringValue = (value: unknown) => (typeof value === 'string' ? value : undefined);

let numberValue = (value: unknown) => (typeof value === 'number' ? value : undefined);

let booleanValue = (value: unknown) => (typeof value === 'boolean' ? value : undefined);

let booleanOrNullValue = (value: unknown): boolean | null | undefined => {
  if (typeof value === 'boolean') return value;
  if (value === null) return null;
  return undefined;
};

let stringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

let firstStringArray = (value: unknown) =>
  Array.isArray(value) ? stringArray(value) : undefined;

let pathLabels = (value: unknown) => {
  if (!Array.isArray(value)) return undefined;

  return value
    .map(path =>
      Array.isArray(path)
        ? path
            .map(item => (isRecord(item) ? stringValue(item.label) : undefined))
            .filter((item): item is string => Boolean(item))
        : []
    )
    .filter(path => path.length > 0);
};

export let summarizeTable = (table: unknown): TableSummary => {
  if (!isRecord(table)) return {};

  return {
    id: stringValue(table.id),
    label: stringValue(table.label),
    description: stringValue(table.description),
    updated: stringValue(table.updated),
    firstPeriod: stringValue(table.firstPeriod),
    lastPeriod: stringValue(table.lastPeriod),
    variableNames: firstStringArray(table.variableNames),
    discontinued: booleanOrNullValue(table.discontinued),
    source: stringValue(table.source),
    subjectCode: stringValue(table.subjectCode),
    timeUnit: stringValue(table.timeUnit),
    pathLabels: pathLabels(table.paths)
  };
};

let getRole = (role: unknown, dimensionId: string) => {
  if (!isRecord(role)) return undefined;

  for (let [key, value] of Object.entries(role)) {
    if (Array.isArray(value) && value.includes(dimensionId)) {
      return key;
    }
  }

  return undefined;
};

let summarizeCodelists = (value: unknown) => {
  if (!Array.isArray(value)) return [];

  return value
    .map(item => {
      if (!isRecord(item)) return null;

      return {
        id: stringValue(item.id),
        label: stringValue(item.label),
        type: stringValue(item.type)
      };
    })
    .filter(
      (
        item
      ): item is {
        id: string | undefined;
        label: string | undefined;
        type: string | undefined;
      } => item !== null
    );
};

let summarizeCategoryValues = (category: JsonRecord, limit: number) => {
  let indexes = isRecord(category.index) ? category.index : {};
  let labels = isRecord(category.label) ? category.label : {};
  let units = isRecord(category.unit) ? category.unit : {};
  let notes = isRecord(category.note) ? category.note : {};

  return Object.entries(indexes)
    .sort(([, left], [, right]) => (numberValue(left) ?? 0) - (numberValue(right) ?? 0))
    .slice(0, limit)
    .map(([code, index]) => {
      let unit = isRecord(units[code]) ? (units[code] as JsonRecord) : undefined;

      return {
        code,
        label: stringValue(labels[code]),
        index: numberValue(index),
        unit: unit
          ? {
              base: stringValue(unit.base),
              decimals: numberValue(unit.decimals)
            }
          : undefined,
        notes: stringArray(notes[code])
      };
    });
};

export let summarizeMetadata = (metadata: unknown, valueLimit: number) => {
  if (!isRecord(metadata)) return {};

  let dimension = isRecord(metadata.dimension) ? metadata.dimension : {};
  let dimensionIds = stringArray(metadata.id);
  let sizes = Array.isArray(metadata.size)
    ? metadata.size
        .map(value => numberValue(value))
        .filter((value): value is number => value !== undefined)
    : [];
  let extension = isRecord(metadata.extension) ? metadata.extension : {};
  let px = isRecord(extension.px) ? extension.px : {};

  return {
    label: stringValue(metadata.label),
    source: stringValue(metadata.source),
    updated: stringValue(metadata.updated),
    notes: stringArray(metadata.note),
    roles: isRecord(metadata.role) ? metadata.role : undefined,
    defaultHeading: stringArray(px.heading),
    defaultStub: stringArray(px.stub),
    dimensions: dimensionIds.map((dimensionId, index) => {
      let item = isRecord(dimension[dimensionId]) ? dimension[dimensionId] : {};
      let category = isRecord(item.category) ? item.category : {};
      let itemExtension = isRecord(item.extension) ? item.extension : {};
      let valueCount = isRecord(category.index) ? Object.keys(category.index).length : 0;

      return {
        id: dimensionId,
        label: stringValue(item.label),
        role: getRole(metadata.role, dimensionId),
        size: sizes[index],
        valueCount,
        valuesTruncated: valueCount > valueLimit,
        elimination: booleanValue(itemExtension.elimination),
        eliminationValueCode: stringValue(itemExtension.eliminationValueCode),
        show: stringValue(itemExtension.show),
        codelists: summarizeCodelists(itemExtension.codelists),
        values: summarizeCategoryValues(category, valueLimit)
      };
    })
  };
};

export let summarizeTablesResponse = (response: unknown) => {
  if (!isRecord(response)) {
    return {
      language: undefined,
      page: undefined,
      tables: []
    };
  }

  return {
    language: stringValue(response.language),
    page: isRecord(response.page) ? response.page : undefined,
    tables: Array.isArray(response.tables) ? response.tables.map(summarizeTable) : []
  };
};

let summarizeValueMap = (value: unknown, limit: number) => {
  if (!isRecord(value)) return {};

  return {
    code: stringValue(value.code),
    label: stringValue(value.label),
    valueMap: stringArray(value.valueMap).slice(0, limit),
    valueMapTruncated: stringArray(value.valueMap).length > limit,
    notes: Array.isArray(value.notes) ? value.notes : undefined
  };
};

export let summarizeCodelist = (codelist: unknown, valueLimit: number) => {
  if (!isRecord(codelist)) return {};

  let values = Array.isArray(codelist.values) ? codelist.values : [];

  return {
    id: stringValue(codelist.id),
    label: stringValue(codelist.label),
    language: stringValue(codelist.language),
    languages: stringArray(codelist.languages),
    type: stringValue(codelist.type),
    elimination: booleanValue(codelist.elimination),
    eliminationValueCode: stringValue(codelist.eliminationValueCode),
    valueCount: values.length,
    valuesTruncated: values.length > valueLimit,
    values: values.slice(0, valueLimit).map(value => summarizeValueMap(value, valueLimit))
  };
};

export let summarizeJsonData = (data: unknown) => {
  if (!isRecord(data)) {
    return {
      label: undefined,
      source: undefined,
      updated: undefined,
      dimensions: [],
      cellCount: undefined,
      valueCount: undefined
    };
  }

  let sizes = Array.isArray(data.size)
    ? data.size
        .map(value => numberValue(value))
        .filter((value): value is number => value !== undefined)
    : [];
  let valueCount = Array.isArray(data.value) ? data.value.length : undefined;
  let cellCount = sizes.length
    ? sizes.reduce((product, size) => product * size, 1)
    : valueCount;

  return {
    label: stringValue(data.label),
    source: stringValue(data.source),
    updated: stringValue(data.updated),
    dimensions: stringArray(data.id),
    cellCount,
    valueCount
  };
};
