import { createAxios } from 'slates';
import { salesforceApiError } from './errors';

export interface SalesforceClientConfig {
  instanceUrl: string;
  apiVersion: string;
  token: string;
}

export let createSalesforceClient = (config: SalesforceClientConfig) => {
  let http = createAxios({
    baseURL: `${config.instanceUrl}/services/data/${config.apiVersion}`,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    }
  });

  let rawHttp = createAxios({
    baseURL: config.instanceUrl,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    }
  });

  return {
    // --- Identity ---

    getUserInfo: async () => {
      try {
        let response = await rawHttp.get('/services/oauth2/userinfo');
        return response.data as Record<string, any>;
      } catch (error) {
        throw salesforceApiError('get user info', error);
      }
    },

    // --- sObject CRUD ---

    getRecord: async (objectType: string, recordId: string, fields?: string[]) => {
      let params: Record<string, string> = {};
      if (fields && fields.length > 0) {
        params.fields = fields.join(',');
      }
      let response = await http.get(`/sobjects/${objectType}/${recordId}`, { params });
      return response.data;
    },

    createRecord: async (objectType: string, data: Record<string, any>) => {
      let response = await http.post(`/sobjects/${objectType}`, data);
      return response.data;
    },

    updateRecord: async (objectType: string, recordId: string, data: Record<string, any>) => {
      await http.patch(`/sobjects/${objectType}/${recordId}`, data);
      return { recordId, success: true };
    },

    deleteRecord: async (objectType: string, recordId: string) => {
      await http.delete(`/sobjects/${objectType}/${recordId}`);
      return { recordId, success: true };
    },

    upsertRecord: async (
      objectType: string,
      externalIdField: string,
      externalIdValue: string,
      data: Record<string, any>
    ) => {
      let response = await http.patch(
        `/sobjects/${objectType}/${externalIdField}/${externalIdValue}`,
        data
      );
      return response.data || { success: true };
    },

    // --- Describe ---

    describeObject: async (objectType: string) => {
      let response = await http.get(`/sobjects/${objectType}/describe`);
      return response.data;
    },

    describeGlobal: async () => {
      let response = await http.get('/sobjects');
      return response.data;
    },

    // --- SOQL & SOSL ---

    query: async (soql: string) => {
      let response = await http.get('/query', { params: { q: soql } });
      return response.data;
    },

    queryMore: async (nextRecordsUrl: string) => {
      let response = await rawHttp.get(nextRecordsUrl);
      return response.data;
    },

    queryAll: async (soql: string) => {
      let response = await http.get('/queryAll', { params: { q: soql } });
      return response.data;
    },

    search: async (sosl: string) => {
      let response = await http.get('/search', { params: { q: sosl } });
      return response.data;
    },

    // --- Composite ---

    composite: async (compositeRequest: { allOrNone: boolean; compositeRequest: any[] }) => {
      let response = await http.post('/composite', compositeRequest);
      return response.data;
    },

    compositeTree: async (objectType: string, records: any[]) => {
      let response = await http.post(`/composite/tree/${objectType}`, { records });
      return response.data;
    },

    compositeCollection: async (method: string, records: any[], allOrNone: boolean) => {
      if (method === 'GET') {
        let ids = records.map(r => r.id || r.Id).join(',');
        let objectType = records[0]?.attributes?.type;
        let response = await http.get(`/composite/sobjects/${objectType}`, {
          params: { ids }
        });
        return response.data;
      }

      let payload: Record<string, any> = { allOrNone, records };
      let response: any;

      if (method === 'POST') {
        response = await http.post('/composite/sobjects', payload);
      } else if (method === 'PATCH') {
        response = await http.patch('/composite/sobjects', payload);
      } else if (method === 'DELETE') {
        let ids = records.map(r => r.id || r.Id).join(',');
        response = await http.delete('/composite/sobjects', { params: { ids, allOrNone } });
      }

      return response?.data;
    },

    // --- Bulk API 2.0 ---

    createBulkJob: async (
      operation: string,
      objectType: string,
      options?: { externalIdFieldName?: string; lineEnding?: string; columnDelimiter?: string }
    ) => {
      let response = await http.post('/jobs/ingest', {
        operation,
        object: objectType,
        contentType: 'CSV',
        ...options
      });
      return response.data;
    },

    uploadBulkJobData: async (jobId: string, csvData: string) => {
      await http.put(`/jobs/ingest/${jobId}/batches`, csvData, {
        headers: { 'Content-Type': 'text/csv' }
      });
      return { success: true };
    },

    closeBulkJob: async (jobId: string) => {
      let response = await http.patch(`/jobs/ingest/${jobId}`, { state: 'UploadComplete' });
      return response.data;
    },

    abortBulkJob: async (jobId: string) => {
      let response = await http.patch(`/jobs/ingest/${jobId}`, { state: 'Aborted' });
      return response.data;
    },

    getBulkJobStatus: async (jobId: string) => {
      let response = await http.get(`/jobs/ingest/${jobId}`);
      return response.data;
    },

    getBulkJobResults: async (
      jobId: string,
      resultType: 'successfulResults' | 'failedResults' | 'unprocessedrecords'
    ) => {
      let response = await http.get(`/jobs/ingest/${jobId}/${resultType}`, {
        headers: { Accept: 'text/csv' }
      });
      return response.data;
    },

    createBulkQueryJob: async (soql: string) => {
      let response = await http.post('/jobs/query', {
        operation: 'query',
        query: soql
      });
      return response.data;
    },

    getBulkQueryJobStatus: async (jobId: string) => {
      let response = await http.get(`/jobs/query/${jobId}`);
      return response.data;
    },

    getBulkQueryResults: async (jobId: string, locator?: string, maxRecords?: number) => {
      let params: Record<string, any> = {};
      if (locator) params.locator = locator;
      if (maxRecords) params.maxRecords = maxRecords;
      let response = await http.get(`/jobs/query/${jobId}/results`, {
        params,
        headers: { Accept: 'text/csv' }
      });
      return {
        data: response.data,
        locator: response.headers?.['sforce-locator'],
        numberOfRecords: response.headers?.['sforce-numberofrecords']
      };
    },

    // --- Reports & Dashboards ---

    runReport: async (reportId: string, metadata?: any) => {
      if (metadata) {
        let response = await http.post(`/analytics/reports/${reportId}`, {
          reportMetadata: metadata
        });
        return response.data;
      }
      let response = await http.get(`/analytics/reports/${reportId}`, {
        params: { includeDetails: true }
      });
      return response.data;
    },

    getReportMetadata: async (reportId: string) => {
      let response = await http.get(`/analytics/reports/${reportId}/describe`);
      return response.data;
    },

    listReports: async () => {
      let response = await http.get('/analytics/reports');
      return response.data;
    },

    listDashboards: async () => {
      let response = await http.get('/analytics/dashboards');
      return response.data;
    },

    getDashboard: async (dashboardId: string) => {
      let response = await http.get(`/analytics/dashboards/${dashboardId}`);
      return response.data;
    },

    // --- Recently Viewed ---

    getRecentlyViewed: async (limit?: number) => {
      let params: Record<string, any> = {};
      if (limit) params.limit = limit;
      let response = await http.get('/recent', { params });
      return response.data;
    },

    // --- Limits ---

    getLimits: async () => {
      let response = await http.get('/limits');
      return response.data;
    },

    // --- Updated/Deleted Records ---

    getUpdatedRecords: async (objectType: string, start: string, end: string) => {
      let response = await http.get(`/sobjects/${objectType}/updated`, {
        params: { start, end }
      });
      return response.data;
    },

    getDeletedRecords: async (objectType: string, start: string, end: string) => {
      let response = await http.get(`/sobjects/${objectType}/deleted`, {
        params: { start, end }
      });
      return response.data;
    },

    // --- GraphQL ---

    graphql: async (queryString: string, variables?: Record<string, any>) => {
      let response = await http.post('/graphql', {
        query: queryString,
        variables: variables || {}
      });
      return response.data;
    },

    // --- Files / Content ---

    getContentDocumentLink: async (recordId: string) => {
      let soql = `SELECT ContentDocumentId, LinkedEntityId FROM ContentDocumentLink WHERE LinkedEntityId = '${recordId}'`;
      let response = await http.get('/query', { params: { q: soql } });
      return response.data;
    },

    getContentVersion: async (contentDocumentId: string) => {
      let soql = `SELECT Id, Title, FileType, ContentSize, VersionData, PathOnClient FROM ContentVersion WHERE ContentDocumentId = '${contentDocumentId}' AND IsLatest = true`;
      let response = await http.get('/query', { params: { q: soql } });
      return response.data;
    },

    downloadFile: async (contentVersionId: string) => {
      let response = await http.get(
        `/sobjects/ContentVersion/${contentVersionId}/VersionData`,
        {
          responseType: 'arraybuffer'
        }
      );
      return response.data;
    },

    // --- Approval Processes ---

    submitForApproval: async (
      actionType: string,
      contextId: string,
      comments?: string,
      nextApproverIds?: string[]
    ) => {
      let request: Record<string, any> = {
        actionType,
        contextId
      };
      if (comments) request.comments = comments;
      if (nextApproverIds) request.nextApproverIds = nextApproverIds;
      let response = await rawHttp.post(
        `/services/data/${config.apiVersion}/process/approvals`,
        { requests: [request] }
      );
      return response.data;
    },

    // --- Chatter ---

    getChatterFeed: async (feedType: string, subjectId?: string) => {
      let feedTypesWithoutSubject = new Set([
        'company',
        'direct-messages',
        'draft',
        'landing',
        'pending-review'
      ]);
      let encodedFeedType = encodeURIComponent(feedType);
      let path =
        subjectId || !feedTypesWithoutSubject.has(feedType)
          ? `/chatter/feeds/${encodedFeedType}/${encodeURIComponent(subjectId ?? 'me')}/feed-elements`
          : `/chatter/feeds/${encodedFeedType}/feed-elements`;
      let response = await rawHttp.get(`/services/data/${config.apiVersion}${path}`);
      return response.data;
    },

    postChatterFeedItem: async (subjectId: string, text: string) => {
      let response = await rawHttp.post(
        `/services/data/${config.apiVersion}/chatter/feed-elements`,
        {
          body: {
            messageSegments: [{ type: 'Text', text }]
          },
          feedElementType: 'FeedItem',
          subjectId
        }
      );
      return response.data;
    }
  };
};
