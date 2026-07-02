import { createAxios } from 'slates';

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
  private axios;

  constructor(private token: string) {
    this.axios = createAxios({
      baseURL: BASE_URL,
      headers: {
        'Content-Type': 'application/json',
        tokenid: token
      }
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

    let response = await this.axios.get(`/api/record/${objectType}`, { params });
    return response.data.data;
  }

  async getRecord(objectType: string, recordId: string): Promise<FireberryRecord> {
    let response = await this.axios.get(`/api/record/${objectType}/${recordId}`);
    return response.data.data.Record;
  }

  async createRecord(objectType: string, data: Record<string, any>): Promise<FireberryRecord> {
    let response = await this.axios.post(`/api/record/${objectType}`, data);
    return response.data.data.Record;
  }

  async updateRecord(
    objectType: string,
    recordId: string,
    data: Record<string, any>
  ): Promise<FireberryRecord> {
    let response = await this.axios.put(`/api/record/${objectType}/${recordId}`, data);
    return response.data.data.Record;
  }

  async deleteRecord(objectType: string, recordId: string): Promise<void> {
    await this.axios.delete(`/api/record/${objectType}/${recordId}`);
  }

  // ---- Related Records ----

  async getRelatedRecords(
    objectType: string,
    recordId: string,
    relatedObjectType: string
  ): Promise<ListRecordsResponse> {
    let response = await this.axios.get(
      `/api/record/${objectType}/${recordId}/${relatedObjectType}`
    );
    return response.data.data;
  }

  // ---- Query ----

  async query(request: QueryRequest): Promise<ListRecordsResponse> {
    let response = await this.axios.post('/api/query', request);
    return response.data.data;
  }

  // ---- Metadata ----

  async getAllObjects(): Promise<MetadataObject[]> {
    let response = await this.axios.get('/metadata/records', {
      params: { tokenid: this.token }
    });
    return response.data.data;
  }

  async getObjectFields(objectId: number | string): Promise<MetadataField[]> {
    let response = await this.axios.get(`/metadata/records/${objectId}/fields`, {
      params: { tokenid: this.token }
    });
    return response.data.data;
  }

  async getFieldDetails(objectId: number | string, fieldName: string): Promise<MetadataField> {
    let response = await this.axios.get(`/metadata/records/${objectId}/fields/${fieldName}`, {
      params: { tokenid: this.token }
    });
    return response.data.data;
  }

  async getPicklistValues(
    objectId: number | string,
    fieldName: string
  ): Promise<MetadataFieldWithValues> {
    let response = await this.axios.get(
      `/metadata/records/${objectId}/fields/${fieldName}/values`,
      {
        params: { tokenid: this.token }
      }
    );
    return response.data.data;
  }
}
