import { createAxios } from 'slates';

let http = createAxios({
  baseURL: 'https://api.mem.ai/v2'
});

// --- Interfaces ---

export interface MemNote {
  id: string;
  title: string;
  content: string | null;
  collection_ids: string[];
  snippet?: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemCollection {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemListNotesResponse {
  request_id: string;
  results: MemNote[];
  total: number;
  next_page: string | null;
}

export interface MemSearchNotesResponse {
  request_id: string;
  results: MemNote[];
  total: number;
}

export interface MemListCollectionsResponse {
  request_id: string;
  results: MemCollection[];
  total: number;
  next_page: string | null;
}

export interface MemSearchCollectionsResponse {
  request_id: string;
  results: MemCollection[];
  total: number;
}

export interface MemNoteResponse extends MemNote {
  request_id: string;
}

export interface MemCollectionResponse extends MemCollection {
  request_id: string;
}

export interface MemRequestIdResponse {
  request_id: string;
}

// --- Client ---

export class MemClient {
  private headers: Record<string, string>;

  constructor(config: { token: string }) {
    this.headers = {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    };
  }

  // --- Notes ---

  async createNote(params: {
    content: string;
    noteId?: string | null;
    collectionIds?: string[] | null;
    collectionTitles?: string[] | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  }): Promise<MemNoteResponse> {
    let response = await http.post(
      '/notes',
      {
        content: params.content,
        id: params.noteId ?? null,
        collection_ids: params.collectionIds ?? null,
        collection_titles: params.collectionTitles ?? null,
        created_at: params.createdAt ?? null,
        updated_at: params.updatedAt ?? null
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async getNote(noteId: string): Promise<MemNoteResponse> {
    let response = await http.get(`/notes/${noteId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listNotes(params?: {
    limit?: number;
    page?: string | null;
    orderBy?: 'created_at' | 'updated_at';
    collectionId?: string | null;
    containsOpenTasks?: boolean;
    containsTasks?: boolean;
    containsImages?: boolean;
    containsFiles?: boolean;
    includeNoteContent?: boolean;
  }): Promise<MemListNotesResponse> {
    let queryParams: Record<string, string | number | boolean> = {};

    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.page) queryParams.page = params.page;
    if (params?.orderBy) queryParams.order_by = params.orderBy;
    if (params?.collectionId) queryParams.collection_id = params.collectionId;
    if (params?.containsOpenTasks) queryParams.contains_open_tasks = true;
    if (params?.containsTasks) queryParams.contains_tasks = true;
    if (params?.containsImages) queryParams.contains_images = true;
    if (params?.containsFiles) queryParams.contains_files = true;
    if (params?.includeNoteContent) queryParams.include_note_content = true;

    let response = await http.get('/notes', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async searchNotes(params: {
    query?: string | null;
    filterByCollectionIds?: string[] | null;
    filterByContainsOpenTasks?: boolean;
    filterByContainsTasks?: boolean;
    filterByContainsImages?: boolean;
    filterByContainsFiles?: boolean;
    includeNoteContent?: boolean;
  }): Promise<MemSearchNotesResponse> {
    let body: Record<string, unknown> = {};

    if (params.query) body.query = params.query;
    if (params.filterByCollectionIds)
      body.filter_by_collection_ids = params.filterByCollectionIds;
    if (params.filterByContainsOpenTasks) body.filter_by_contains_open_tasks = true;
    if (params.filterByContainsTasks) body.filter_by_contains_tasks = true;
    if (params.filterByContainsImages) body.filter_by_contains_images = true;
    if (params.filterByContainsFiles) body.filter_by_contains_files = true;
    if (params.includeNoteContent) body.config = { include_note_content: true };

    let response = await http.post('/notes/search', body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteNote(noteId: string): Promise<MemRequestIdResponse> {
    let response = await http.delete(`/notes/${noteId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Collections ---

  async createCollection(params: {
    title: string;
    collectionId?: string | null;
    description?: string | null;
    createdAt?: string | null;
    updatedAt?: string | null;
  }): Promise<MemCollectionResponse> {
    let response = await http.post(
      '/collections',
      {
        title: params.title,
        id: params.collectionId ?? null,
        description: params.description ?? null,
        created_at: params.createdAt ?? null,
        updated_at: params.updatedAt ?? null
      },
      { headers: this.headers }
    );
    return response.data;
  }

  async getCollection(collectionId: string): Promise<MemCollectionResponse> {
    let response = await http.get(`/collections/${collectionId}`, {
      headers: this.headers
    });
    return response.data;
  }

  async listCollections(params?: {
    limit?: number;
    page?: string | null;
    orderBy?: 'created_at' | 'updated_at';
  }): Promise<MemListCollectionsResponse> {
    let queryParams: Record<string, string | number> = {};

    if (params?.limit !== undefined) queryParams.limit = params.limit;
    if (params?.page) queryParams.page = params.page;
    if (params?.orderBy) queryParams.order_by = params.orderBy;

    let response = await http.get('/collections', {
      headers: this.headers,
      params: queryParams
    });
    return response.data;
  }

  async searchCollections(params: {
    query?: string | null;
  }): Promise<MemSearchCollectionsResponse> {
    let body: Record<string, unknown> = {};

    if (params.query) body.query = params.query;

    let response = await http.post('/collections/search', body, {
      headers: this.headers
    });
    return response.data;
  }

  async deleteCollection(collectionId: string): Promise<MemRequestIdResponse> {
    let response = await http.delete(`/collections/${collectionId}`, {
      headers: this.headers
    });
    return response.data;
  }

  // --- Mem It ---

  async memIt(params: {
    input: string;
    instructions?: string | null;
    context?: string | null;
    timestamp?: string | null;
  }): Promise<MemRequestIdResponse> {
    let response = await http.post(
      '/mem-it',
      {
        input: params.input,
        instructions: params.instructions ?? null,
        context: params.context ?? null,
        timestamp: params.timestamp ?? null
      },
      { headers: this.headers }
    );
    return response.data;
  }
}
