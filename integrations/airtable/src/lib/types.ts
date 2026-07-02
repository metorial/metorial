export interface AirtableRecord {
  id: string;
  createdTime: string;
  fields: Record<string, any>;
}

export interface AirtableListRecordsResponse {
  records: AirtableRecord[];
  offset?: string;
}

export interface AirtableTable {
  id: string;
  name: string;
  description?: string;
  primaryFieldId: string;
  fields: AirtableField[];
  views: AirtableView[];
}

export interface AirtableField {
  id: string;
  name: string;
  type: string;
  description?: string;
  options?: Record<string, any>;
}

export interface AirtableView {
  id: string;
  name: string;
  type: string;
  personalForCurrentUser?: boolean;
}

export interface AirtableBase {
  id: string;
  name: string;
  permissionLevel: string;
}

export interface AirtableBaseSchema {
  tables: AirtableTable[];
}

export interface AirtableComment {
  id: string;
  text: string;
  author: {
    id: string;
    email: string;
    name?: string;
  };
  createdTime: string;
}

export interface AirtableListCommentsResponse {
  comments: AirtableComment[];
  offset?: string | null;
}

export interface AirtableWebhook {
  id: string;
  type: string;
  isHookEnabled: boolean;
  expirationTime?: string;
  cursorForNextPayload?: number;
  areNotificationsEnabled: boolean;
  createdTime: string;
  specification: {
    options: WebhookSpecificationOptions;
  };
  notificationUrl: string | null;
}

export interface WebhookSpecificationOptions {
  filters?: {
    dataTypes?: string[];
    recordChangeScope?: string;
    sourceOptions?: {
      formSubmission?: {
        formId: string;
      };
    };
  };
}

export interface WebhookPayload {
  timestamp: string;
  baseTransactionNumber: number;
  payloadFormat: string;
  actionMetadata: {
    source: string;
    sourceMetadata?: Record<string, any>;
  };
  changedTablesById: Record<
    string,
    {
      changedRecordsById?: Record<
        string,
        {
          current?: { cellValuesByFieldId: Record<string, any> };
          previous?: { cellValuesByFieldId: Record<string, any> };
          unchanged?: { cellValuesByFieldId: Record<string, any> };
        }
      >;
      createdRecordsById?: Record<
        string,
        {
          createdTime: string;
          cellValuesByFieldId: Record<string, any>;
        }
      >;
      destroyedRecordIds?: string[];
      changedFieldsById?: Record<
        string,
        {
          current: Record<string, any>;
          previous?: Record<string, any>;
        }
      >;
      createdFieldsById?: Record<string, Record<string, any>>;
      destroyedFieldIds?: string[];
      changedViewsById?: Record<string, Record<string, any>>;
      createdViewsById?: Record<string, Record<string, any>>;
      destroyedViewIds?: string[];
    }
  >;
}

export interface WebhookPayloadsResponse {
  payloads: {
    timestamp: string;
    baseTransactionNumber: number;
    payloadFormat: string;
    actionMetadata: {
      source: string;
      sourceMetadata?: Record<string, any>;
    };
    changedTablesById: Record<string, any>;
  }[];
  cursor: number;
  mightHaveMore: boolean;
}

export interface CreateWebhookResponse {
  id: string;
  macSecretBase64: string;
  expirationTime: string;
}
