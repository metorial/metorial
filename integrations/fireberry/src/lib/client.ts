import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  isApiErrorRecord
} from 'slates';

let BASE_URL = 'https://api.fireberry.com';

export interface FireberryRecord {
  [key: string]: any;
}

export interface ListRecordsResponse {
  PrimaryKey: string;
  PrimaryField: string;
  Total_Records: number;
  Page_Size: number;
  Page_Number: number;
  Records: FireberryRecord[];
}

export interface SingleRecordResponse {
  Record: FireberryRecord;
}

export interface QueryRequest {
  objecttype: number | string;
  page_size?: number;
  page_number?: number;
  fields?: string;
  query?: string;
  sort_by?: string;
  sort_type?: string;
}

export interface QueryV3Request {
  objectType: number;
  fields: { name: string; alias?: string; aggrFunc?: 'SUM' | 'COUNT' | 'MIN' | 'MAX' }[];
  filter?: {
    type: 'AND' | 'OR';
    conditions: {
      fieldName: string;
      operator: string;
      value?: string | number | boolean | (string | number | boolean)[];
    }[];
  }[];
  orderBy?: { name: string; order?: 'asc' | 'desc' }[];
  groupBy?: { name: string; datePeriod?: string }[];
  pageSize?: number;
  pageNumber?: number;
}

export interface QueryV3Response {
  data: FireberryRecord[];
  pageSize: number;
  pageNumber: number;
  isLastPage: boolean;
}

export interface MetadataObject {
  name: string;
  systemName: string;
  objectType: string;
}

export interface MetadataField {
  label: string;
  fieldName: string;
  systemFieldTypeId: string;
  fieldObjectType: string;
  systemName: string;
}

export interface PicklistValue {
  name: string;
  value: string;
}

export interface MetadataFieldWithValues extends MetadataField {
  values: PicklistValue[];
}

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;
  private token: string;

  constructor(token: string) {
    this.token = token.trim();
    if (!this.token) throw createApiServiceError('A Fireberry API access token is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: BASE_URL,
      authHeader: { name: 'tokenid', value: this.token },
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Fireberry',
          reason: 'fireberry_api_error'
        })
    });
    this.axios.interceptors.response.use(response => {
      if (isApiErrorRecord(response.data) && response.data.success === false) {
        throw buildApiServiceError(
          { response: { status: response.status, data: response.data } },
          { providerLabel: 'Fireberry', reason: 'fireberry_api_error' }
        );
      }
      return response;
    });
  }

  // ---- Record CRUD ----

  async listRecords(
    objectType: string,
    pageSize?: number,
    pageNumber?: number
  ): Promise<ListRecordsResponse> {
    let params: Record<string, string> = {};
    if (pageSize !== undefined) params.pagesize = String(pageSize);
    if (pageNumber !== undefined) params.pagenumber = String(pageNumber);

    let response = await this.axios.get(`/api/record/${encodeURIComponent(objectType)}`, {
      params
    });
    return response.data.data;
  }

  async getRecord(objectType: string, recordId: string): Promise<FireberryRecord> {
    let response = await this.axios.get(
      `/api/record/${encodeURIComponent(objectType)}/${encodeURIComponent(recordId)}`
    );
    return response.data.data.Record;
  }

  async createRecord(objectType: string, data: Record<string, any>): Promise<FireberryRecord> {
    let response = await this.axios.post(
      `/api/record/${encodeURIComponent(objectType)}`,
      data
    );
    return response.data.data.Record;
  }

  async updateRecord(
    objectType: string,
    recordId: string,
    data: Record<string, any>
  ): Promise<FireberryRecord> {
    let response = await this.axios.put(
      `/api/record/${encodeURIComponent(objectType)}/${encodeURIComponent(recordId)}`,
      data
    );
    return response.data.data.Record;
  }

  async deleteRecord(objectType: string, recordId: string): Promise<void> {
    await this.axios.delete(
      `/api/record/${encodeURIComponent(objectType)}/${encodeURIComponent(recordId)}`
    );
  }

  // ---- Related Records ----

  async getRelatedRecords(
    objectType: string,
    recordId: string,
    relatedObjectType: string,
    pageSize?: number,
    pageNumber?: number
  ): Promise<ListRecordsResponse> {
    let primaryType = await this.resolveObjectType(objectType);
    let relatedType = await this.resolveObjectType(relatedObjectType);
    let response = await this.axios.get(
      `/api/record/${primaryType}/${encodeURIComponent(recordId)}/${relatedType}`,
      { params: { pagesize: pageSize, pagenumber: pageNumber } }
    );
    return response.data.data;
  }

  // ---- Query ----

  async query(request: QueryRequest): Promise<ListRecordsResponse> {
    let objecttype = await this.resolveObjectType(request.objecttype);
    let response = await this.axios.post('/api/query', { ...request, objecttype });
    return response.data.data;
  }

  async queryV3(request: QueryV3Request): Promise<QueryV3Response> {
    let response = await this.axios.post<QueryV3Response>('/api/v3/query', request);
    return response.data;
  }

  private async resolveObjectType(value: string | number): Promise<number> {
    let number =
      typeof value === 'number'
        ? value
        : /^\d+$/.test(value.trim())
          ? Number(value)
          : undefined;
    if (number !== undefined) {
      if (!Number.isSafeInteger(number) || number < 1) {
        throw createApiServiceError('The object type number must be a positive integer.');
      }
      return number;
    }

    let objects = await this.getAllObjects();
    let object = objects.find(
      item =>
        typeof item.systemName === 'string' &&
        item.systemName.toLowerCase() === String(value).trim().toLowerCase()
    );
    let objectType = Number(object?.objectType);
    if (!object || !Number.isSafeInteger(objectType) || objectType < 1) {
      throw createApiServiceError(
        'Unknown object type. Call list_objects to discover an accessible object system name or number.'
      );
    }
    return objectType;
  }

  // ---- Metadata ----

  async getAllObjects(): Promise<MetadataObject[]> {
    let response = await this.axios.get('/metadata/records', {
      params: { tokenid: this.token }
    });
    let objects = response.data?.data;
    if (!Array.isArray(objects) || objects.some(object => !isApiErrorRecord(object))) {
      throw createApiServiceError(
        'Fireberry returned an unexpected object metadata response.'
      );
    }
    return objects;
  }

  async getObjectFields(objectId: number | string): Promise<MetadataField[]> {
    let response = await this.axios.get(
      `/metadata/records/${encodeURIComponent(String(objectId))}/fields`,
      { params: { tokenid: this.token } }
    );
    return response.data.data;
  }

  async getFieldDetails(
    objectId: number | string,
    fieldName: string
  ): Promise<Record<string, unknown>> {
    let response = await this.axios.get(
      `/metadata/records/${encodeURIComponent(String(objectId))}/fields/${encodeURIComponent(fieldName)}`,
      { params: { tokenid: this.token } }
    );
    let field = response.data?.data;
    if (!isApiErrorRecord(field)) {
      throw createApiServiceError('Fireberry returned an unexpected field metadata response.');
    }
    return field;
  }

  async getPicklistValues(
    objectId: number | string,
    fieldName: string
  ): Promise<MetadataFieldWithValues> {
    let response = await this.axios.get(
      `/metadata/records/${encodeURIComponent(String(objectId))}/fields/${encodeURIComponent(fieldName)}/values`,
      { params: { tokenid: this.token } }
    );
    return response.data.data;
  }
}
