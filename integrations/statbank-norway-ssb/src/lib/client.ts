import { createAxios } from 'slates';
import { ssbApiError } from './errors';

export type SsbLanguage = 'en' | 'no';

export type SsbOutputFormat = 'json-stat2' | 'json-px' | 'csv' | 'xlsx' | 'html' | 'px';

export type SsbOutputFormatParam =
  | 'UseCodes'
  | 'UseTexts'
  | 'UseCodesAndTexts'
  | 'IncludeTitle'
  | 'SeparatorTab'
  | 'SeparatorSpace'
  | 'SeparatorSemicolon'
  | 'ExcludeZerosAndMissingValues';

export type QueryMethod = 'get' | 'post';

export type OutputValuesMode = 'aggregated' | 'single';

export type TableSearchParams = {
  language: SsbLanguage;
  query?: string;
  pastDays?: number;
  includeDiscontinued?: boolean;
  pageNumber?: number;
  pageSize?: number;
};

export type CodelistSelection = {
  variableCode: string;
  codelistId: string;
};

export type TableSelection = {
  variableCode: string;
  valueCodes: string[];
  codelist?: string;
  outputValues?: OutputValuesMode;
};

export type TableQuery = {
  tableId: string;
  language: SsbLanguage;
  selection?: TableSelection[];
  outputFormat: SsbOutputFormat;
  outputFormatParams?: SsbOutputFormatParam[];
  placement?: {
    heading?: string[];
    stub?: string[];
  };
  method: QueryMethod;
};

export type TableDataResult = {
  data: unknown;
  contentType?: string;
};

let http = createAxios({
  baseURL: 'https://data.ssb.no/api/pxwebapi/v2'
});

http.interceptors.response.use(
  response => response,
  error => Promise.reject(ssbApiError(error))
);

let cleanRecord = (value: Record<string, string | number | boolean | undefined>) => {
  let params: Record<string, string | number | boolean> = {};

  for (let [key, entry] of Object.entries(value)) {
    if (entry !== undefined) {
      params[key] = entry;
    }
  }

  return params;
};

let baseDataParams = (query: TableQuery) =>
  cleanRecord({
    lang: query.language,
    outputFormat: query.outputFormat,
    outputFormatParams: query.outputFormatParams?.join(',')
  });

let addPlacementParams = (
  params: Record<string, string | number | boolean>,
  query: TableQuery
) => {
  if (query.placement?.heading?.length) {
    params.heading = query.placement.heading.join(',');
  }
  if (query.placement?.stub?.length) {
    params.stub = query.placement.stub.join(',');
  }
};

let addSelectionParams = (
  params: Record<string, string | number | boolean>,
  query: TableQuery
) => {
  for (let selection of query.selection ?? []) {
    params[`valueCodes[${selection.variableCode}]`] = selection.valueCodes.join(',');
    if (selection.codelist) {
      params[`codelist[${selection.variableCode}]`] = selection.codelist;
    }
    if (selection.outputValues) {
      params[`outputValues[${selection.variableCode}]`] = selection.outputValues;
    }
  }
};

let addOutputValuesParams = (
  params: Record<string, string | number | boolean>,
  query: TableQuery
) => {
  for (let selection of query.selection ?? []) {
    if (selection.outputValues) {
      params[`outputValues[${selection.variableCode}]`] = selection.outputValues;
    }
  }
};

let responseTypeForFormat = (format: SsbOutputFormat) => {
  switch (format) {
    case 'csv':
    case 'html':
    case 'px':
      return 'text' as const;
    case 'xlsx':
      return 'arraybuffer' as const;
    case 'json-px':
    case 'json-stat2':
      return 'json' as const;
  }
};

export class SsbClient {
  async searchTables(params: TableSearchParams): Promise<unknown> {
    try {
      let response = await http.get('/tables', {
        params: cleanRecord({
          lang: params.language,
          query: params.query,
          pastDays: params.pastDays,
          includeDiscontinued: params.includeDiscontinued,
          pageNumber: params.pageNumber,
          pageSize: params.pageSize
        })
      });

      return response.data;
    } catch (error) {
      throw ssbApiError(error, 'table search');
    }
  }

  async getTable(tableId: string, language: SsbLanguage): Promise<unknown> {
    try {
      let response = await http.get(`/tables/${encodeURIComponent(tableId)}`, {
        params: { lang: language }
      });

      return response.data;
    } catch (error) {
      throw ssbApiError(error, 'table lookup');
    }
  }

  async getMetadata(params: {
    tableId: string;
    language: SsbLanguage;
    codelists?: CodelistSelection[];
  }): Promise<unknown> {
    try {
      let queryParams: Record<string, string | number | boolean> = {
        lang: params.language
      };

      for (let codelist of params.codelists ?? []) {
        queryParams[`codelist[${codelist.variableCode}]`] = codelist.codelistId;
      }

      let response = await http.get(`/tables/${encodeURIComponent(params.tableId)}/metadata`, {
        params: queryParams
      });

      return response.data;
    } catch (error) {
      throw ssbApiError(error, 'table metadata lookup');
    }
  }

  async getCodelist(codelistId: string, language: SsbLanguage): Promise<unknown> {
    try {
      let response = await http.get(`/codelists/${encodeURIComponent(codelistId)}`, {
        params: { lang: language }
      });

      return response.data;
    } catch (error) {
      throw ssbApiError(error, 'codelist lookup');
    }
  }

  async queryTable(query: TableQuery): Promise<TableDataResult> {
    try {
      let params = baseDataParams(query);

      if (query.method === 'get') {
        addSelectionParams(params, query);
        addPlacementParams(params, query);
      } else {
        addOutputValuesParams(params, query);
      }

      let response =
        query.method === 'get'
          ? await http.get(`/tables/${encodeURIComponent(query.tableId)}/data`, {
              params,
              responseType: responseTypeForFormat(query.outputFormat)
            })
          : await http.post(
              `/tables/${encodeURIComponent(query.tableId)}/data`,
              {
                selection: (query.selection ?? []).map(selection => ({
                  variableCode: selection.variableCode,
                  valueCodes: selection.valueCodes,
                  ...(selection.codelist ? { codelist: selection.codelist } : {})
                })),
                ...(query.placement ? { placement: query.placement } : {})
              },
              {
                params,
                responseType: responseTypeForFormat(query.outputFormat)
              }
            );

      return {
        data: response.data,
        contentType:
          typeof response.headers?.['content-type'] === 'string'
            ? response.headers['content-type']
            : undefined
      };
    } catch (error) {
      throw ssbApiError(error, 'table data query');
    }
  }
}
