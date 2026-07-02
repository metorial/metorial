import { createAxios } from '@slates/provider';
import { withFirebaseApiError } from './errors';

let firestoreAxios = createAxios({
  baseURL: 'https://firestore.googleapis.com/v1'
});

export interface FirestoreDocument {
  name?: string;
  fields?: Record<string, FirestoreValue>;
  createTime?: string;
  updateTime?: string;
}

export type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { nullValue: null }
  | { timestampValue: string }
  | { arrayValue: { values?: FirestoreValue[] } }
  | { mapValue: { fields?: Record<string, FirestoreValue> } }
  | { referenceValue: string }
  | { geoPointValue: { latitude: number; longitude: number } }
  | { bytesValue: string };

export let encodeFirestoreValue = (value: any): FirestoreValue => {
  if (value === null || value === undefined) {
    return { nullValue: null };
  }
  if (typeof value === 'string') {
    return { stringValue: value };
  }
  if (typeof value === 'number') {
    if (Number.isInteger(value)) {
      return { integerValue: String(value) };
    }
    return { doubleValue: value };
  }
  if (typeof value === 'boolean') {
    return { booleanValue: value };
  }
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map(encodeFirestoreValue) } };
  }
  if (typeof value === 'object') {
    let fields: Record<string, FirestoreValue> = {};
    for (let key of Object.keys(value)) {
      fields[key] = encodeFirestoreValue(value[key]);
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(value) };
};

export let decodeFirestoreValue = (value: FirestoreValue): any => {
  if ('stringValue' in value) return value.stringValue;
  if ('integerValue' in value) return Number.parseInt(value.integerValue, 10);
  if ('doubleValue' in value) return value.doubleValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('nullValue' in value) return null;
  if ('timestampValue' in value) return value.timestampValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('geoPointValue' in value) return value.geoPointValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('arrayValue' in value) {
    return (value.arrayValue.values || []).map(decodeFirestoreValue);
  }
  if ('mapValue' in value) {
    let result: Record<string, any> = {};
    let fields = value.mapValue.fields || {};
    for (let key of Object.keys(fields)) {
      result[key] = decodeFirestoreValue(fields[key]!);
    }
    return result;
  }
  return null;
};

export let decodeFirestoreDocument = (doc: FirestoreDocument): Record<string, any> => {
  let result: Record<string, any> = {};
  if (doc.fields) {
    for (let key of Object.keys(doc.fields)) {
      result[key] = decodeFirestoreValue(doc.fields[key]!);
    }
  }
  return result;
};

export let encodeFirestoreFields = (
  data: Record<string, any>
): Record<string, FirestoreValue> => {
  let fields: Record<string, FirestoreValue> = {};
  for (let key of Object.keys(data)) {
    fields[key] = encodeFirestoreValue(data[key]);
  }
  return fields;
};

export class FirestoreClient {
  private token: string;
  private projectId: string;
  private databaseId: string;

  constructor(params: { token: string; projectId: string; databaseId?: string }) {
    this.token = params.token;
    this.projectId = params.projectId;
    this.databaseId = params.databaseId || '(default)';
  }

  private get basePath() {
    return `/projects/${this.projectId}/databases/${this.databaseId}/documents`;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'x-goog-user-project': this.projectId
    };
  }

  async getDocument(
    collectionPath: string,
    documentId: string
  ): Promise<{
    documentPath: string;
    fields: Record<string, any>;
    createTime: string;
    updateTime: string;
  }> {
    let response = await withFirebaseApiError('Firestore get document', () =>
      firestoreAxios.get(`${this.basePath}/${collectionPath}/${documentId}`, {
        headers: this.headers
      })
    );

    let doc = response.data as FirestoreDocument;
    return {
      documentPath: doc.name || '',
      fields: decodeFirestoreDocument(doc),
      createTime: doc.createTime || '',
      updateTime: doc.updateTime || ''
    };
  }

  async createDocument(
    collectionPath: string,
    documentId: string | undefined,
    fields: Record<string, any>
  ): Promise<{
    documentPath: string;
    documentId: string;
    fields: Record<string, any>;
    createTime: string;
    updateTime: string;
  }> {
    let params: Record<string, string> = {};
    if (documentId) {
      params.documentId = documentId;
    }

    let response = await withFirebaseApiError('Firestore create document', () =>
      firestoreAxios.post(
        `${this.basePath}/${collectionPath}`,
        {
          fields: encodeFirestoreFields(fields)
        },
        {
          headers: this.headers,
          params
        }
      )
    );

    let doc = response.data as FirestoreDocument;
    let name = doc.name || '';
    let parts = name.split('/');
    let createdDocId = parts[parts.length - 1] || '';

    return {
      documentPath: name,
      documentId: createdDocId,
      fields: decodeFirestoreDocument(doc),
      createTime: doc.createTime || '',
      updateTime: doc.updateTime || ''
    };
  }

  async updateDocument(
    collectionPath: string,
    documentId: string,
    fields: Record<string, any>,
    updateMask?: string[]
  ): Promise<{
    documentPath: string;
    fields: Record<string, any>;
    updateTime: string;
  }> {
    let params = new URLSearchParams();
    if (updateMask && updateMask.length > 0) {
      for (let fieldPath of updateMask) {
        params.append('updateMask.fieldPaths', fieldPath);
      }
    }

    let response = await withFirebaseApiError('Firestore update document', () =>
      firestoreAxios.patch(
        `${this.basePath}/${collectionPath}/${documentId}`,
        {
          fields: encodeFirestoreFields(fields)
        },
        {
          headers: this.headers,
          params
        }
      )
    );

    let doc = response.data as FirestoreDocument;
    return {
      documentPath: doc.name || '',
      fields: decodeFirestoreDocument(doc),
      updateTime: doc.updateTime || ''
    };
  }

  async deleteDocument(collectionPath: string, documentId: string): Promise<void> {
    await withFirebaseApiError('Firestore delete document', () =>
      firestoreAxios.delete(`${this.basePath}/${collectionPath}/${documentId}`, {
        headers: this.headers
      })
    );
  }

  async listDocuments(
    collectionPath: string,
    params?: {
      pageSize?: number;
      pageToken?: string;
      orderBy?: string;
    }
  ): Promise<{
    documents: Array<{
      documentPath: string;
      documentId: string;
      fields: Record<string, any>;
      createTime: string;
      updateTime: string;
    }>;
    nextPageToken?: string;
  }> {
    let response = await withFirebaseApiError('Firestore list documents', () =>
      firestoreAxios.get(`${this.basePath}/${collectionPath}`, {
        headers: this.headers,
        params: {
          pageSize: params?.pageSize || 20,
          pageToken: params?.pageToken,
          orderBy: params?.orderBy
        }
      })
    );

    let documents = (response.data.documents || []).map((doc: FirestoreDocument) => {
      let name = doc.name || '';
      let parts = name.split('/');
      let docId = parts[parts.length - 1] || '';
      return {
        documentPath: name,
        documentId: docId,
        fields: decodeFirestoreDocument(doc),
        createTime: doc.createTime || '',
        updateTime: doc.updateTime || ''
      };
    });

    return {
      documents,
      nextPageToken: response.data.nextPageToken
    };
  }

  async queryDocuments(
    collectionPath: string,
    query: {
      where?: Array<{
        field: string;
        op: string;
        value: any;
      }>;
      orderBy?: Array<{
        field: string;
        direction?: 'ASCENDING' | 'DESCENDING';
      }>;
      limit?: number;
      offset?: number;
    }
  ): Promise<
    Array<{
      documentPath: string;
      documentId: string;
      fields: Record<string, any>;
      createTime: string;
      updateTime: string;
    }>
  > {
    let structuredQuery: any = {
      from: [{ collectionId: collectionPath.split('/').pop() }]
    };

    if (query.where && query.where.length > 0) {
      if (query.where.length === 1) {
        let w = query.where[0]!;
        structuredQuery.where = {
          fieldFilter: {
            field: { fieldPath: w.field },
            op: w.op,
            value: encodeFirestoreValue(w.value)
          }
        };
      } else {
        structuredQuery.where = {
          compositeFilter: {
            op: 'AND',
            filters: query.where.map(w => ({
              fieldFilter: {
                field: { fieldPath: w.field },
                op: w.op,
                value: encodeFirestoreValue(w.value)
              }
            }))
          }
        };
      }
    }

    if (query.orderBy && query.orderBy.length > 0) {
      structuredQuery.orderBy = query.orderBy.map(o => ({
        field: { fieldPath: o.field },
        direction: o.direction || 'ASCENDING'
      }));
    }

    if (query.limit) {
      structuredQuery.limit = query.limit;
    }

    if (query.offset) {
      structuredQuery.offset = query.offset;
    }

    let parentPath = collectionPath.includes('/')
      ? `${this.basePath}/${collectionPath.split('/').slice(0, -1).join('/')}`
      : this.basePath;

    let response = await withFirebaseApiError('Firestore run query', () =>
      firestoreAxios.post(
        `${parentPath}:runQuery`,
        {
          structuredQuery
        },
        {
          headers: this.headers
        }
      )
    );

    return (response.data || [])
      .filter((r: any) => r.document)
      .map((r: any) => {
        let doc = r.document as FirestoreDocument;
        let name = doc.name || '';
        let parts = name.split('/');
        let docId = parts[parts.length - 1] || '';
        return {
          documentPath: name,
          documentId: docId,
          fields: decodeFirestoreDocument(doc),
          createTime: doc.createTime || '',
          updateTime: doc.updateTime || ''
        };
      });
  }
}
