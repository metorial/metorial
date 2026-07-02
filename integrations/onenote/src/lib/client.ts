import { createAxios } from 'slates';

export interface NotebookResponse {
  notebookId: string;
  displayName: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  isDefault: boolean;
  isShared: boolean;
  sectionsUrl: string;
  sectionGroupsUrl: string;
  selfUrl: string;
  createdBy: { user?: { displayName?: string; userId?: string } };
  lastModifiedBy: { user?: { displayName?: string; userId?: string } };
}

export interface SectionResponse {
  sectionId: string;
  displayName: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  isDefault: boolean;
  pagesUrl: string;
  selfUrl: string;
  parentNotebookId?: string;
  parentSectionGroupId?: string;
}

export interface SectionGroupResponse {
  sectionGroupId: string;
  displayName: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  sectionsUrl: string;
  sectionGroupsUrl: string;
  selfUrl: string;
  parentNotebookId?: string;
  parentSectionGroupId?: string;
}

export interface PageResponse {
  pageId: string;
  title: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  contentUrl: string;
  selfUrl: string;
  parentSectionId?: string;
  level: number;
  order: number;
}

export interface PagePreviewResponse {
  previewText: string;
}

export interface CopyOperationResponse {
  operationId: string;
  status: string;
  resourceLocation?: string;
  percentComplete?: string;
  createdDateTime: string;
}

export interface OneNoteOperationResponse extends CopyOperationResponse {
  resourceId?: string;
  lastActionDateTime?: string;
  error?: any;
}

let mapNotebook = (nb: any): NotebookResponse => ({
  notebookId: nb.id,
  displayName: nb.displayName,
  createdDateTime: nb.createdDateTime,
  lastModifiedDateTime: nb.lastModifiedDateTime,
  isDefault: nb.isDefault ?? false,
  isShared: nb.isShared ?? false,
  sectionsUrl: nb.sectionsUrl ?? '',
  sectionGroupsUrl: nb.sectionGroupsUrl ?? '',
  selfUrl: nb.self ?? '',
  createdBy: nb.createdBy ?? {},
  lastModifiedBy: nb.lastModifiedBy ?? {}
});

let mapSection = (s: any): SectionResponse => ({
  sectionId: s.id,
  displayName: s.displayName,
  createdDateTime: s.createdDateTime,
  lastModifiedDateTime: s.lastModifiedDateTime,
  isDefault: s.isDefault ?? false,
  pagesUrl: s.pagesUrl ?? '',
  selfUrl: s.self ?? '',
  parentNotebookId: s.parentNotebook?.id,
  parentSectionGroupId: s.parentSectionGroup?.id
});

let mapSectionGroup = (sg: any): SectionGroupResponse => ({
  sectionGroupId: sg.id,
  displayName: sg.displayName,
  createdDateTime: sg.createdDateTime,
  lastModifiedDateTime: sg.lastModifiedDateTime,
  sectionsUrl: sg.sectionsUrl ?? '',
  sectionGroupsUrl: sg.sectionGroupsUrl ?? '',
  selfUrl: sg.self ?? '',
  parentNotebookId: sg.parentNotebook?.id,
  parentSectionGroupId: sg.parentSectionGroup?.id
});

let mapPage = (p: any): PageResponse => ({
  pageId: p.id,
  title: p.title ?? '',
  createdDateTime: p.createdDateTime,
  lastModifiedDateTime: p.lastModifiedDateTime,
  contentUrl: p.contentUrl ?? '',
  selfUrl: p.self ?? '',
  parentSectionId: p.parentSection?.id,
  level: p.level ?? 0,
  order: p.order ?? 0
});

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });
  }

  // --- Notebooks ---

  async listNotebooks(params?: {
    filter?: string;
    orderBy?: string;
    top?: number;
    skip?: number;
    select?: string;
  }): Promise<{ notebooks: NotebookResponse[]; nextLink?: string }> {
    let queryParams: Record<string, string> = {};
    if (params?.filter) queryParams.$filter = params.filter;
    if (params?.orderBy) queryParams.$orderby = params.orderBy;
    if (params?.top) queryParams.$top = String(params.top);
    if (params?.skip) queryParams.$skip = String(params.skip);
    if (params?.select) queryParams.$select = params.select;

    let response = await this.http.get('/me/onenote/notebooks', { params: queryParams });
    let data = response.data;

    return {
      notebooks: (data.value ?? []).map(mapNotebook),
      nextLink: data['@odata.nextLink']
    };
  }

  async getNotebook(notebookId: string): Promise<NotebookResponse> {
    let response = await this.http.get(`/me/onenote/notebooks/${notebookId}`);
    return mapNotebook(response.data);
  }

  async createNotebook(displayName: string): Promise<NotebookResponse> {
    let response = await this.http.post('/me/onenote/notebooks', { displayName });
    return mapNotebook(response.data);
  }

  async deleteNotebook(notebookId: string): Promise<void> {
    await this.http.delete(`/me/onenote/notebooks/${notebookId}`);
  }

  async copyNotebook(
    notebookId: string,
    params: {
      groupId?: string;
      renameAs?: string;
      siteCollectionId?: string;
      siteId?: string;
    }
  ): Promise<CopyOperationResponse> {
    let response = await this.http.post(
      `/me/onenote/notebooks/${notebookId}/copyNotebook`,
      params
    );
    let op = response.data;
    return {
      operationId: op.id ?? '',
      status: op.status ?? 'unknown',
      resourceLocation: op.resourceLocation,
      percentComplete: op.percentComplete,
      createdDateTime: op.createdDateTime ?? new Date().toISOString()
    };
  }

  // --- Sections ---

  async listSections(
    notebookId: string,
    params?: {
      filter?: string;
      orderBy?: string;
      top?: number;
      skip?: number;
      select?: string;
    }
  ): Promise<{ sections: SectionResponse[]; nextLink?: string }> {
    let queryParams: Record<string, string> = {};
    if (params?.filter) queryParams.$filter = params.filter;
    if (params?.orderBy) queryParams.$orderby = params.orderBy;
    if (params?.top) queryParams.$top = String(params.top);
    if (params?.skip) queryParams.$skip = String(params.skip);
    if (params?.select) queryParams.$select = params.select;

    let response = await this.http.get(`/me/onenote/notebooks/${notebookId}/sections`, {
      params: queryParams
    });
    let data = response.data;

    return {
      sections: (data.value ?? []).map(mapSection),
      nextLink: data['@odata.nextLink']
    };
  }

  async getSection(sectionId: string): Promise<SectionResponse> {
    let response = await this.http.get(`/me/onenote/sections/${sectionId}`);
    return mapSection(response.data);
  }

  async createSection(notebookId: string, displayName: string): Promise<SectionResponse> {
    let response = await this.http.post(`/me/onenote/notebooks/${notebookId}/sections`, {
      displayName
    });
    return mapSection(response.data);
  }

  async deleteSection(sectionId: string): Promise<void> {
    await this.http.delete(`/me/onenote/sections/${sectionId}`);
  }

  async createSectionInGroup(
    sectionGroupId: string,
    displayName: string
  ): Promise<SectionResponse> {
    let response = await this.http.post(
      `/me/onenote/sectionGroups/${sectionGroupId}/sections`,
      { displayName }
    );
    return mapSection(response.data);
  }

  async copySection(
    sectionId: string,
    params: {
      destinationNotebookId?: string;
      destinationSectionGroupId?: string;
      renameAs?: string;
      siteCollectionId?: string;
      siteId?: string;
      groupId?: string;
    }
  ): Promise<CopyOperationResponse> {
    let body: Record<string, string> = {};
    if (params.destinationNotebookId) body.id = params.destinationNotebookId;
    if (params.destinationSectionGroupId) body.id = params.destinationSectionGroupId;
    if (params.renameAs) body.renameAs = params.renameAs;
    if (params.siteCollectionId) body.siteCollectionId = params.siteCollectionId;
    if (params.siteId) body.siteId = params.siteId;
    if (params.groupId) body.groupId = params.groupId;

    let response = await this.http.post(
      `/me/onenote/sections/${sectionId}/copyToNotebook`,
      body
    );
    let op = response.data;
    return {
      operationId: op.id ?? '',
      status: op.status ?? 'unknown',
      resourceLocation: op.resourceLocation,
      percentComplete: op.percentComplete,
      createdDateTime: op.createdDateTime ?? new Date().toISOString()
    };
  }

  // --- Section Groups ---

  async listSectionGroups(
    notebookId: string,
    params?: {
      filter?: string;
      orderBy?: string;
      top?: number;
      skip?: number;
    }
  ): Promise<{ sectionGroups: SectionGroupResponse[]; nextLink?: string }> {
    let queryParams: Record<string, string> = {};
    if (params?.filter) queryParams.$filter = params.filter;
    if (params?.orderBy) queryParams.$orderby = params.orderBy;
    if (params?.top) queryParams.$top = String(params.top);
    if (params?.skip) queryParams.$skip = String(params.skip);

    let response = await this.http.get(`/me/onenote/notebooks/${notebookId}/sectionGroups`, {
      params: queryParams
    });
    let data = response.data;

    return {
      sectionGroups: (data.value ?? []).map(mapSectionGroup),
      nextLink: data['@odata.nextLink']
    };
  }

  async getSectionGroup(sectionGroupId: string): Promise<SectionGroupResponse> {
    let response = await this.http.get(`/me/onenote/sectionGroups/${sectionGroupId}`);
    return mapSectionGroup(response.data);
  }

  async createSectionGroup(
    notebookId: string,
    displayName: string
  ): Promise<SectionGroupResponse> {
    let response = await this.http.post(`/me/onenote/notebooks/${notebookId}/sectionGroups`, {
      displayName
    });
    return mapSectionGroup(response.data);
  }

  async deleteSectionGroup(sectionGroupId: string): Promise<void> {
    await this.http.delete(`/me/onenote/sectionGroups/${sectionGroupId}`);
  }

  async createNestedSectionGroup(
    parentSectionGroupId: string,
    displayName: string
  ): Promise<SectionGroupResponse> {
    let response = await this.http.post(
      `/me/onenote/sectionGroups/${parentSectionGroupId}/sectionGroups`,
      { displayName }
    );
    return mapSectionGroup(response.data);
  }

  // --- Pages ---

  async listPages(
    sectionId: string,
    params?: {
      filter?: string;
      orderBy?: string;
      top?: number;
      skip?: number;
      select?: string;
      search?: string;
    }
  ): Promise<{ pages: PageResponse[]; nextLink?: string }> {
    let queryParams: Record<string, string> = {};
    if (params?.filter) queryParams.$filter = params.filter;
    if (params?.orderBy) queryParams.$orderby = params.orderBy;
    if (params?.top) queryParams.$top = String(params.top);
    if (params?.skip) queryParams.$skip = String(params.skip);
    if (params?.select) queryParams.$select = params.select;
    if (params?.search) queryParams.$search = params.search;

    let response = await this.http.get(`/me/onenote/sections/${sectionId}/pages`, {
      params: queryParams
    });
    let data = response.data;

    return {
      pages: (data.value ?? []).map(mapPage),
      nextLink: data['@odata.nextLink']
    };
  }

  async getPage(pageId: string): Promise<PageResponse> {
    let response = await this.http.get(`/me/onenote/pages/${pageId}`);
    return mapPage(response.data);
  }

  async getPageContent(pageId: string): Promise<string> {
    let response = await this.http.get(`/me/onenote/pages/${pageId}/content`, {
      headers: { Accept: 'text/html' },
      responseType: 'text'
    });
    return response.data;
  }

  async getPagePreview(pageId: string): Promise<PagePreviewResponse> {
    let response = await this.http.get(`/me/onenote/pages/${pageId}/preview`);
    return {
      previewText: response.data.previewText ?? ''
    };
  }

  async createPage(sectionId: string, htmlContent: string): Promise<PageResponse> {
    let response = await this.http.post(
      `/me/onenote/sections/${sectionId}/pages`,
      htmlContent,
      {
        headers: {
          'Content-Type': 'text/html'
        }
      }
    );
    return mapPage(response.data);
  }

  async updatePageContent(
    pageId: string,
    operations: Array<{
      target: string;
      action: 'replace' | 'append' | 'delete' | 'insert' | 'prepend';
      content?: string;
      position?: 'after' | 'before';
    }>
  ): Promise<void> {
    await this.http.patch(`/me/onenote/pages/${pageId}/content`, operations);
  }

  async copyPageToSection(
    pageId: string,
    destinationSectionId: string,
    groupId?: string,
    siteCollectionId?: string,
    siteId?: string
  ): Promise<CopyOperationResponse> {
    let body: Record<string, string> = {
      id: destinationSectionId
    };
    if (groupId) body.groupId = groupId;
    if (siteCollectionId) body.siteCollectionId = siteCollectionId;
    if (siteId) body.siteId = siteId;

    let response = await this.http.post(`/me/onenote/pages/${pageId}/copyToSection`, body);
    let op = response.data;
    return {
      operationId: op.id ?? '',
      status: op.status ?? 'unknown',
      resourceLocation: op.resourceLocation,
      percentComplete: op.percentComplete,
      createdDateTime: op.createdDateTime ?? new Date().toISOString()
    };
  }

  async deletePage(pageId: string): Promise<void> {
    await this.http.delete(`/me/onenote/pages/${pageId}`);
  }

  async getOperation(operationId: string): Promise<OneNoteOperationResponse> {
    let response = await this.http.get(`/me/onenote/operations/${operationId}`);
    let operation = response.data;

    return {
      operationId: operation.id ?? operationId,
      status: operation.status ?? 'unknown',
      resourceId: operation.resourceId,
      resourceLocation: operation.resourceLocation,
      percentComplete: operation.percentComplete,
      createdDateTime: operation.createdDateTime ?? new Date().toISOString(),
      lastActionDateTime: operation.lastActionDateTime,
      error: operation.error
    };
  }

  // --- Search ---

  // Matches by page title only. Graph's `$search` on /me/onenote/pages would also
  // match page content, but returned inconsistent results and is not supported on
  // all tenants, so we fall back to an OData `$filter` over the title.
  async searchPages(
    query: string,
    params?: {
      sectionId?: string;
      top?: number;
      skip?: number;
      filter?: string;
    }
  ): Promise<{ pages: PageResponse[]; nextLink?: string }> {
    let escapedQuery = query.replace(/'/g, "''").toLowerCase();
    let filters = [`contains(tolower(title),'${escapedQuery}')`];
    if (params?.filter) {
      filters.push(`(${params.filter})`);
    }

    let path = params?.sectionId
      ? `/me/onenote/sections/${params.sectionId}/pages`
      : '/me/onenote/pages';

    let response = await this.http.get(path, {
      params: {
        $filter: filters.join(' and '),
        ...(params?.top ? { $top: String(params.top) } : {}),
        ...(params?.skip ? { $skip: String(params.skip) } : {})
      }
    });
    let data = response.data;

    return {
      pages: (data.value ?? []).map(mapPage),
      nextLink: data['@odata.nextLink']
    };
  }

  // --- Recent Notebooks ---

  async getRecentNotebooks(includePersonalNotebooks: boolean = true): Promise<
    Array<{
      displayName: string;
      lastAccessedTime: string;
      sourceService: string;
      notebookUrl: string;
    }>
  > {
    let response = await this.http.get(
      '/me/onenote/notebooks/getRecentNotebooks(includePersonalNotebooks=' +
        includePersonalNotebooks +
        ')'
    );
    return (response.data.value ?? []).map((nb: any) => ({
      displayName: nb.displayName,
      lastAccessedTime: nb.lastAccessedTime ?? '',
      sourceService: nb.sourceService ?? '',
      notebookUrl: nb.links?.oneNoteWebUrl?.href ?? ''
    }));
  }
}
