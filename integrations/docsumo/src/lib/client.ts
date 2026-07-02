import { createAxios } from 'slates';

export interface DocsumoDocument {
  docId: string;
  title: string;
  status: string;
  type: string;
  typeTitle?: string;
  createdAt?: string;
  createdAtIso?: string;
  modifiedAtIso?: string;
  email?: string;
  reviewUrl?: string;
  userDocId?: string;
  docMetaData?: string;
  userId?: string;
  folderId?: string;
  folderName?: string;
  approvedWithError?: boolean;
  convertedToDigital?: boolean;
  reviewToken?: boolean;
  previewImage?: {
    url: string;
    width: number;
    height: number;
  };
  uploadedBy?: {
    userId: string;
    email: string;
    fullName: string;
    avatarUrl?: string;
  };
  timeDict?: {
    processingTime: number;
    totalTime: number;
  };
}

export interface DocumentType {
  docTypeId: string;
  title: string;
  docType: string;
  canUpload: boolean;
  isDefault: boolean;
  docCounts: {
    all: number;
    processed: number;
    reviewing: number;
  };
  uploadEmail?: string;
}

export interface ListDocumentsParams {
  view?: 'files' | 'folder' | 'all_files';
  folderId?: string;
  limit?: number;
  offset?: number;
  docType?: string;
  status?: 'reviewing' | 'processed' | 'erred';
  query?: string;
  sortBy?: 'created_date.asc' | 'created_date.desc';
  createdDateGte?: string;
  createdDateLte?: string;
}

export interface UploadUrlParams {
  fileUrl: string;
  documentType: string;
  userDocId?: string;
  docMetaData?: string;
  reviewToken?: boolean;
  filename?: string;
  password?: string;
}

export interface UploadBase64Params {
  base64Content: string;
  documentType: string;
  filename: string;
  userDocId?: string;
  docMetaData?: string;
  reviewToken?: boolean;
  password?: string;
}

let mapDocument = (doc: any): DocsumoDocument => ({
  docId: doc.doc_id,
  title: doc.title,
  status: doc.status,
  type: doc.type,
  typeTitle: doc.type_title,
  createdAt: doc.created_at,
  createdAtIso: doc.created_at_iso,
  modifiedAtIso: doc.modified_at_iso,
  email: doc.email,
  reviewUrl: doc.review_url,
  userDocId: doc.user_doc_id,
  docMetaData: doc.doc_meta_data,
  userId: doc.user_id,
  folderId: doc.folder_id,
  folderName: doc.folder_name,
  approvedWithError: doc.approved_with_error,
  convertedToDigital: doc.converted_to_digital,
  reviewToken: doc.review_token,
  previewImage: doc.preview_image
    ? {
        url: doc.preview_image.url,
        width: doc.preview_image.width,
        height: doc.preview_image.height
      }
    : undefined,
  uploadedBy: doc.uploaded_by
    ? {
        userId: doc.uploaded_by.user_id,
        email: doc.uploaded_by.email,
        fullName: doc.uploaded_by.full_name,
        avatarUrl: doc.uploaded_by.avatar_url
      }
    : undefined,
  timeDict: doc.time_dict
    ? {
        processingTime: doc.time_dict.processing_time,
        totalTime: doc.time_dict.total_time
      }
    : undefined
});

export class Client {
  private axios;

  constructor(options: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://app.docsumo.com',
      headers: {
        'X-API-KEY': options.token
      }
    });
  }

  async listDocuments(params: ListDocumentsParams = {}): Promise<{
    documents: DocsumoDocument[];
    total: number;
    limit: number;
    offset: number;
  }> {
    let queryParams: Record<string, string> = {};

    if (params.view) queryParams.view = params.view;
    if (params.folderId) queryParams.folder_id = params.folderId;
    if (params.limit !== undefined) queryParams.limit = String(params.limit);
    if (params.offset !== undefined) queryParams.offset = String(params.offset);
    if (params.docType) queryParams.doc_type = params.docType;
    if (params.status) queryParams.status = params.status;
    if (params.query) queryParams.q = params.query;
    if (params.sortBy) queryParams.sort_by = params.sortBy;
    if (params.createdDateGte) queryParams.created_date = `gte:${params.createdDateGte}`;
    if (params.createdDateLte) {
      queryParams.created_date = queryParams.created_date
        ? `${queryParams.created_date},lte:${params.createdDateLte}`
        : `lte:${params.createdDateLte}`;
    }

    let response = await this.axios.get('/api/v1/eevee/apikey/documents/all/', {
      params: queryParams
    });

    let data = response.data?.data || {};
    let documents = (data.documents || []).map(mapDocument);

    return {
      documents,
      total: data.total || 0,
      limit: data.limit || 0,
      offset: data.offset || 0
    };
  }

  async getDocumentDetail(docId: string): Promise<DocsumoDocument> {
    let response = await this.axios.get(`/api/v1/eevee/apikey/documents/detail/${docId}/`);
    let doc = response.data?.data?.document || response.data?.data || {};
    return mapDocument(doc);
  }

  async deleteDocument(docId: string): Promise<void> {
    await this.axios.delete(`/api/v1/eevee/apikey/delete/${docId}/`);
  }

  async uploadFromUrl(params: UploadUrlParams): Promise<DocsumoDocument[]> {
    let formData = new FormData();
    formData.append('file', params.fileUrl);
    formData.append('file_type', 'url');
    formData.append('type', params.documentType);
    if (params.userDocId) formData.append('user_doc_id', params.userDocId);
    if (params.docMetaData) formData.append('doc_meta_data', params.docMetaData);
    if (params.reviewToken !== undefined)
      formData.append('review_token', String(params.reviewToken));
    if (params.filename) formData.append('filename', params.filename);
    if (params.password) formData.append('password', params.password);

    let response = await this.axios.post('/api/v1/eevee/apikey/upload/custom/', formData);
    let documents = (response.data?.data?.document || []).map(mapDocument);
    return documents;
  }

  async uploadFromBase64(params: UploadBase64Params): Promise<DocsumoDocument[]> {
    let formData = new FormData();
    formData.append('file', params.base64Content);
    formData.append('file_type', 'base64');
    formData.append('type', params.documentType);
    formData.append('filename', params.filename);
    if (params.userDocId) formData.append('user_doc_id', params.userDocId);
    if (params.docMetaData) formData.append('doc_meta_data', params.docMetaData);
    if (params.reviewToken !== undefined)
      formData.append('review_token', String(params.reviewToken));
    if (params.password) formData.append('password', params.password);

    let response = await this.axios.post('/api/v1/eevee/apikey/upload/custom/', formData);
    let documents = (response.data?.data?.document || []).map(mapDocument);
    return documents;
  }

  async getExtractedData(docId: string): Promise<{
    sections: Record<string, any>;
    metaData: Record<string, any>;
  }> {
    let response = await this.axios.get(`/api/v1/eevee/apikey/data/simplified/${docId}/`);
    let data = response.data?.data || {};
    let metaData = data.meta_data || {};
    let sections: Record<string, any> = {};

    for (let key of Object.keys(data)) {
      if (key !== 'meta_data') {
        sections[key] = data[key];
      }
    }

    return { sections, metaData };
  }

  async updateReviewStatus(
    docId: string,
    action: 'review' | 'skip' | 'finish'
  ): Promise<void> {
    let actionPath: string;
    switch (action) {
      case 'review':
        actionPath = 'start_review';
        break;
      case 'skip':
        actionPath = 'review_skipped';
        break;
      case 'finish':
        actionPath = 'finish_review';
        break;
    }

    await this.axios.post(`/api/v1/pik/review/${docId}/${actionPath}/`);
  }

  async getDocumentTypes(): Promise<DocumentType[]> {
    let response = await this.axios.get('/api/v1/eevee/apikey/limit/');
    let data = response.data?.data || {};
    let docTypes = data.document_types || data.documents || [];

    return docTypes.map((dt: any) => ({
      docTypeId: dt.id || dt.doc_type_id || '',
      title: dt.title || '',
      docType: dt.doc_type || '',
      canUpload: dt.can_upload ?? true,
      isDefault: dt.default ?? false,
      docCounts: {
        all: dt.doc_counts?.all || 0,
        processed: dt.doc_counts?.processed || 0,
        reviewing: dt.doc_counts?.reviewing || 0
      },
      uploadEmail: dt.upload_email
    }));
  }

  async getDocumentsSummary(): Promise<DocumentType[]> {
    let response = await this.axios.get('/api/v1/eevee/apikey/documents/summary/');
    let data = response.data?.data || {};
    let docTypes = data.document || data.documents || [];

    return docTypes.map((dt: any) => ({
      docTypeId: dt.id || dt.doc_type_id || '',
      title: dt.title || '',
      docType: dt.doc_type || '',
      canUpload: dt.can_upload ?? true,
      isDefault: dt.default ?? false,
      docCounts: {
        all: dt.doc_counts?.all || 0,
        processed: dt.doc_counts?.processed || 0,
        reviewing: dt.doc_counts?.reviewing || 0
      },
      uploadEmail: dt.upload_email
    }));
  }

  async getReviewUrl(docId: string): Promise<string> {
    let response = await this.axios.get(`/api/v1/eevee/apikey/review-url/${docId}/`);
    return response.data?.data?.review_url || response.data?.data?.url || '';
  }

  async getUserDetails(): Promise<{
    userId: string;
    email: string;
    fullName: string;
    monthlyDocCurrent: number;
    monthlyDocLimit: number;
  }> {
    let response = await this.axios.get('/api/v1/eevee/apikey/limit/');
    let data = response.data?.data || {};
    return {
      userId: data.user_id || '',
      email: data.email || '',
      fullName: data.full_name || '',
      monthlyDocCurrent: data.monthly_doc_current || 0,
      monthlyDocLimit: data.monthly_doc_limit || 0
    };
  }
}
