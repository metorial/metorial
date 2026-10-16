import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';
import { z } from 'zod';

export let profileSchema = z.object({
  email: z.string(),
  firstName: z.string(),
  lastName: z.string()
});

let legacyValueSchema = z.object({
  confidenceScore: z.number(),
  value: z.string(),
  pageNumber: z.number(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number()
});
let legacyFieldSchema = z.object({
  name: z.string(),
  dataType: z.string(),
  values: z.array(legacyValueSchema)
});
let legacyResultSchema = z.object({
  objectId: z.string(),
  extractedFields: z.array(legacyFieldSchema),
  lineItems: z.array(z.unknown()),
  fileName: z.string()
});
let nullableValueResultSchema = legacyResultSchema.extend({
  lineItems: legacyResultSchema.shape.lineItems.optional(),
  extractedFields: z.array(
    legacyFieldSchema.extend({
      values: z.array(legacyValueSchema.extend({ value: z.string().optional() }))
    })
  ),
  raw: z.record(z.string(), z.unknown())
});
let documentTypesSchema = z.array(
  z.object({
    slug: z.string(),
    name: z.string(),
    fieldsCount: z.number(),
    lineItemFieldsCount: z.number(),
    documentsCount: z.number(),
    modelsCount: z.number()
  })
);

export let extractionDataSchema = z
  .object({
    status: z.string(),
    error: z.record(z.string(), z.unknown()).nullable(),
    result: z.record(z.string(), z.unknown()).nullable()
  })
  .passthrough();
export let trainingValueSchema = z.object({
  value: z.string().nullable().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  page_number: z.number().optional()
});
export let trainingFieldSchema = z.object({
  name: z.string(),
  value: z.array(trainingValueSchema)
});
export type TrainingField = z.infer<typeof trainingFieldSchema>;

type FileInput = { documentTypeName: string; file: string; fileName: string };

export let toTyplessServiceError = (error: unknown) =>
  buildApiServiceError(error, {
    providerLabel: 'Typless',
    reason: 'typless_api_error',
    extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
    detailKeys: ['message', 'detail', 'code', 'msg'],
    nestedKeys: ['details', 'errors'],
    extractUpstreamCode: (_error, response) =>
      isApiErrorRecord(response?.data) && typeof response.data.code === 'string'
        ? response.data.code
        : undefined
  });

let parseResponse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  let result = schema.safeParse(value);
  if (!result.success) {
    throw createApiServiceError('Typless returned an unexpected response format.', {
      reason: 'typless_invalid_response'
    });
  }
  return result.data;
};

let record = (value: unknown): Record<string, unknown> =>
  isApiErrorRecord(value) ? value : {};

let mapLegacyResult = (value: unknown, allowNullValues: boolean) => {
  let data = record(value);
  let fields = Array.isArray(data.extracted_fields)
    ? data.extracted_fields.map(fieldValue => {
        let field = record(fieldValue);
        return {
          name: field.name,
          dataType: field.data_type,
          values: Array.isArray(field.values)
            ? field.values.map(value => {
                let item = record(value);
                let confidence = item.confidence_score;
                return {
                  confidenceScore:
                    typeof confidence === 'string' && confidence.trim() !== ''
                      ? Number(confidence)
                      : confidence,
                  value: allowNullValues && item.value === null ? undefined : item.value,
                  pageNumber: item.page_number,
                  x: item.x,
                  y: item.y,
                  width: item.width,
                  height: item.height
                };
              })
            : field.values
        };
      })
    : data.extracted_fields;
  return {
    objectId: data.object_id,
    extractedFields: fields,
    lineItems: data.line_items,
    fileName: data.file_name
  };
};

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://developers.typless.com/api/',
      authHeader: { value: `Token ${config.token}` },
      errorAdapter: toTyplessServiceError
    });
    this.axios.interceptors.response.use(response => {
      let data: unknown = response.data;
      if (
        isApiErrorRecord(data) &&
        typeof data.code === 'string' &&
        typeof data.message === 'string' &&
        ('details' in data || 'detail' in data)
      ) {
        throw toTyplessServiceError({ response: { status: response.status, data } });
      }
      return response;
    });
  }

  private legacyFileBody(params: FileInput) {
    let boundary = `----SlatesBoundary${Date.now()}`;
    let body = `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="document_type_name"\r\n\r\n';
    body += `${params.documentTypeName}\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="file"; filename="${params.fileName}"\r\n`;
    body += 'Content-Type: application/octet-stream\r\n';
    body += 'Content-Transfer-Encoding: base64\r\n\r\n';
    body += `${params.file}\r\n`;
    body += `--${boundary}--\r\n`;
    return { body, headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` } };
  }

  async extractData(params: FileInput) {
    let { body, headers } = this.legacyFileBody(params);
    let response = await this.axios.post('/document-types/extract-data/', body, { headers });
    return parseResponse(nullableValueResultSchema, {
      ...mapLegacyResult(response.data, true),
      raw: response.data
    });
  }

  async addDocumentFeedback(params: {
    documentTypeName: string;
    documentObjectId: string;
    learningFields: Array<{ name: string; value: string }>;
  }): Promise<void> {
    let boundary = `----SlatesBoundary${Date.now()}`;
    let body = `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="document_type_name"\r\n\r\n';
    body += `${params.documentTypeName}\r\n`;
    body += `--${boundary}\r\n`;
    body += 'Content-Disposition: form-data; name="document_object_id"\r\n\r\n';
    body += `${params.documentObjectId}\r\n`;
    for (let field of params.learningFields) {
      body += `--${boundary}\r\n`;
      body += 'Content-Disposition: form-data; name="learning_fields"\r\n\r\n';
      body += `${JSON.stringify({ name: field.name, value: field.value })}\r\n`;
    }
    body += `--${boundary}--\r\n`;
    await this.axios.post('/document-types/learn/', body, {
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` }
    });
  }

  async startTraining(params: { documentTypeName: string }): Promise<void> {
    await this.axios.post('/start-training/', null, {
      params: { document_type_name: params.documentTypeName }
    });
  }

  async getDocumentTypes() {
    let response = await this.axios.get('/document-types/');
    let data: unknown = response.data;
    let envelope = record(data);
    let types = Array.isArray(data) ? data : (envelope.results ?? envelope.document_types);
    let mapped = Array.isArray(types)
      ? types.map(value => {
          let dt = record(value);
          return {
            slug: dt.slug ?? dt.document_type_name,
            name: dt.name ?? dt.document_type_name,
            fieldsCount: dt.fields_count ?? dt.metadata_fields_count,
            lineItemFieldsCount: dt.line_item_fields_count,
            documentsCount: dt.documents_count,
            modelsCount: dt.models_count
          };
        })
      : types;
    return parseResponse(documentTypesSchema, mapped);
  }

  async getAuthenticationProfile() {
    let response = await this.axios.get('/user-profile/');
    return parseResponse(
      z.object({
        email: z.string(),
        first_name: z.string().nullish(),
        last_name: z.string().nullish()
      }),
      response.data
    );
  }

  async getUserProfile() {
    let response = await this.axios.get('/user-profile/');
    return this.mapProfile(response.data);
  }

  private mapProfile(value: unknown) {
    let data = record(value);
    return parseResponse(profileSchema, {
      email: data.email,
      firstName: data.first_name,
      lastName: data.last_name
    });
  }

  async updateUserProfile(params: { firstName?: string; lastName?: string; email?: string }) {
    let payload: Record<string, string> = {};
    if (params.firstName !== undefined) payload.first_name = params.firstName;
    if (params.lastName !== undefined) payload.last_name = params.lastName;
    if (params.email !== undefined) payload.email = params.email;
    let response = await this.axios.patch('/user-profile/', payload);
    return this.mapProfile(response.data);
  }

  async extractDataAsync(params: FileInput) {
    let { body, headers } = this.legacyFileBody(params);
    let response = await this.axios.post('/document-types/extract-data-async/', body, {
      headers
    });
    return parseResponse(z.object({ extractionId: z.string() }), {
      extractionId: response.data.extraction_id
    });
  }

  async getExtractionResult(params: { extractionId: string }) {
    let response = await this.axios.get(
      `/receive-result/${encodeURIComponent(params.extractionId)}/`
    );
    let data = record(response.data);
    let result = data.result;
    return parseResponse(
      z.object({
        status: z.string(),
        error: z.unknown().nullable(),
        result: legacyResultSchema.nullable()
      }),
      {
        status: data.status,
        error: data.error,
        result:
          isApiErrorRecord(result) && Object.keys(result).length > 0
            ? mapLegacyResult(result, false)
            : result === null || (isApiErrorRecord(result) && Object.keys(result).length === 0)
              ? null
              : result
      }
    );
  }

  async submitExtraction(
    params: FileInput & { customer?: string; parseTextBlocks?: boolean }
  ) {
    let response = await this.axios.post('/v1/extract-data-async', {
      document_type_name: params.documentTypeName,
      file: params.file,
      file_name: params.fileName,
      customer: params.customer,
      parse_text_blocks: params.parseTextBlocks
    });
    return parseResponse(z.object({ extraction_id: z.string() }), response.data);
  }

  async getExtractionData(params: { extractionId: string; textBlocks?: boolean }) {
    let response = await this.axios.get('/v1/get-extraction-data', {
      params: { extraction_id: params.extractionId, text_blocks: params.textBlocks }
    });
    return parseResponse(extractionDataSchema, response.data);
  }

  async listPendingExtractions(params: { customer?: string }) {
    let response = await this.axios.get('/v1/awaiting-poll', {
      params: { customer: params.customer }
    });
    return parseResponse(z.object({ extraction_ids: z.array(z.string()) }), response.data);
  }

  async addTrainingDocument(
    params: FileInput & {
      learningFields: TrainingField[];
      lineItems?: TrainingField[][];
      vatRates?: TrainingField[][];
    }
  ) {
    for (let field of [
      ...params.learningFields,
      ...(params.lineItems ?? []).flat(),
      ...(params.vatRates ?? []).flat()
    ]) {
      for (let value of field.value) {
        for (let coordinate of [
          value.x,
          value.y,
          value.width,
          value.height,
          value.page_number
        ]) {
          if (coordinate !== undefined && !Number.isInteger(coordinate)) {
            throw createApiServiceError(
              'Training coordinates and page numbers must be whole numbers.'
            );
          }
        }
      }
    }
    let response = await this.axios.post('/v1/add-document', {
      document_type_name: params.documentTypeName,
      file: params.file,
      file_name: params.fileName,
      learning_fields: params.learningFields,
      line_items: params.lineItems,
      vat_rates: params.vatRates
    });
    return parseResponse(
      z.object({ message: z.string(), details: z.string() }),
      response.data
    );
  }
}
