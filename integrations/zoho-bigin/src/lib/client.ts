import { createAxios } from 'slates';

export class BiginClient {
  private axios;

  constructor(params: { token: string; apiDomain: string }) {
    this.axios = createAxios({
      baseURL: `${params.apiDomain}/bigin/v2`,
      headers: {
        Authorization: `Zoho-oauthtoken ${params.token}`
      }
    });
  }

  // ─── Records ───────────────────────────────────────────────

  async getRecords(
    module: string,
    options?: {
      fields?: string;
      sortBy?: string;
      sortOrder?: string;
      page?: number;
      perPage?: number;
      cvid?: string;
      pageToken?: string;
    }
  ): Promise<any> {
    let response = await this.axios.get(`/${module}`, {
      params: options
        ? {
            fields: options.fields,
            sort_by: options.sortBy,
            sort_order: options.sortOrder,
            page: options.page,
            per_page: options.perPage,
            cvid: options.cvid,
            page_token: options.pageToken
          }
        : undefined
    });
    return response.data;
  }

  async getRecord(module: string, recordId: string): Promise<any> {
    let response = await this.axios.get(`/${module}/${recordId}`);
    return response.data;
  }

  async createRecords(
    module: string,
    records: Record<string, any>[],
    trigger?: string[]
  ): Promise<any> {
    let body: Record<string, any> = { data: records };
    if (trigger) {
      body.trigger = trigger;
    }
    let response = await this.axios.post(`/${module}`, body);
    return response.data;
  }

  async updateRecords(module: string, records: Record<string, any>[]): Promise<any> {
    let response = await this.axios.put(`/${module}`, { data: records });
    return response.data;
  }

  async updateRecord(
    module: string,
    recordId: string,
    record: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(`/${module}/${recordId}`, { data: [record] });
    return response.data;
  }

  async deleteRecords(module: string, ids: string[]): Promise<any> {
    let response = await this.axios.delete(`/${module}`, {
      params: { ids: ids.join(',') }
    });
    return response.data;
  }

  async upsertRecords(
    module: string,
    records: Record<string, any>[],
    duplicateCheckFields?: string[]
  ): Promise<any> {
    let body: Record<string, any> = { data: records };
    if (duplicateCheckFields && duplicateCheckFields.length > 0) {
      body.duplicate_check_fields = duplicateCheckFields;
    }
    let response = await this.axios.post(`/${module}/upsert`, body);
    return response.data;
  }

  // ─── Search ────────────────────────────────────────────────

  async searchRecords(
    module: string,
    options: {
      criteria?: string;
      email?: string;
      phone?: string;
      word?: string;
      page?: number;
      perPage?: number;
    }
  ): Promise<any> {
    let response = await this.axios.get(`/${module}/search`, {
      params: {
        criteria: options.criteria,
        email: options.email,
        phone: options.phone,
        word: options.word,
        page: options.page,
        per_page: options.perPage
      }
    });
    return response.data;
  }

  // ─── Related Records ──────────────────────────────────────

  async getRelatedRecords(
    module: string,
    recordId: string,
    relatedModule: string,
    options?: {
      page?: number;
      perPage?: number;
    }
  ): Promise<any> {
    let response = await this.axios.get(`/${module}/${recordId}/${relatedModule}`, {
      params: options
        ? {
            page: options.page,
            per_page: options.perPage
          }
        : undefined
    });
    return response.data;
  }

  async updateRelatedRecord(
    module: string,
    recordId: string,
    relatedModule: string,
    relatedRecordId: string,
    data: Record<string, any>
  ): Promise<any> {
    let response = await this.axios.put(
      `/${module}/${recordId}/${relatedModule}/${relatedRecordId}`,
      { data: [data] }
    );
    return response.data;
  }

  async delinkRelatedRecord(
    module: string,
    recordId: string,
    relatedModule: string,
    relatedRecordId: string
  ): Promise<any> {
    let response = await this.axios.delete(
      `/${module}/${recordId}/${relatedModule}/${relatedRecordId}`
    );
    return response.data;
  }

  // ─── Notes ─────────────────────────────────────────────────

  async getNotes(
    module: string,
    recordId: string,
    options?: {
      page?: number;
      perPage?: number;
    }
  ): Promise<any> {
    let response = await this.axios.get(`/${module}/${recordId}/Notes`, {
      params: {
        fields:
          'id,Note_Title,Note_Content,Created_Time,Modified_Time,Owner,Parent_Id,se_module',
        page: options?.page,
        per_page: options?.perPage
      }
    });
    return response.data;
  }

  async createNote(
    module: string,
    recordId: string,
    note: { title?: string; content: string }
  ): Promise<any> {
    let response = await this.axios.post(`/${module}/${recordId}/Notes`, {
      data: [
        {
          Note_Title: note.title || '',
          Note_Content: note.content
        }
      ]
    });
    return response.data;
  }

  async updateNote(noteId: string, note: { title?: string; content?: string }): Promise<any> {
    let body: Record<string, any> = { id: noteId };
    if (note.title !== undefined) body.Note_Title = note.title;
    if (note.content !== undefined) body.Note_Content = note.content;
    let response = await this.axios.put(`/Notes/${noteId}`, { data: [body] });
    return response.data;
  }

  async deleteNote(noteId: string): Promise<any> {
    let response = await this.axios.delete(`/Notes/${noteId}`);
    return response.data;
  }

  // ─── Tags ──────────────────────────────────────────────────

  async getTags(module: string): Promise<any> {
    let response = await this.axios.get(`/settings/tags`, {
      params: { module }
    });
    return response.data;
  }

  async createTag(module: string, names: string[]): Promise<any> {
    let response = await this.axios.post(
      `/settings/tags`,
      {
        tags: names.map(name => ({ name }))
      },
      {
        params: { module }
      }
    );
    return response.data;
  }

  async addTagsToRecords(
    module: string,
    recordIds: string[],
    tagNames: string[],
    overWrite?: boolean
  ): Promise<any> {
    let response = await this.axios.post(
      `/${module}/actions/add_tags`,
      {
        tags: tagNames.map(name => ({ name })),
        ids: recordIds
      },
      {
        params: { over_write: overWrite || false }
      }
    );
    return response.data;
  }

  async removeTagsFromRecord(
    module: string,
    recordId: string,
    tagNames: string[]
  ): Promise<any> {
    let response = await this.axios.post(`/${module}/${recordId}/actions/remove_tags`, null, {
      params: { tag_names: tagNames.join(',') }
    });
    return response.data;
  }

  async deleteTag(tagId: string): Promise<any> {
    let response = await this.axios.delete(`/settings/tags/${tagId}`);
    return response.data;
  }

  // ─── Metadata ──────────────────────────────────────────────

  async getModules(): Promise<any> {
    let response = await this.axios.get(`/settings/modules`);
    return response.data;
  }

  async getFields(module: string): Promise<any> {
    let response = await this.axios.get(`/settings/fields`, {
      params: { module }
    });
    return response.data;
  }

  async getLayouts(module: string): Promise<any> {
    let response = await this.axios.get(`/settings/layouts`, {
      params: { module }
    });
    return response.data;
  }

  async getCustomViews(module: string): Promise<any> {
    let response = await this.axios.get(`/settings/custom_views`, {
      params: { module }
    });
    return response.data;
  }

  async getRelatedLists(module: string): Promise<any> {
    let response = await this.axios.get(`/settings/related_lists`, {
      params: { module }
    });
    return response.data;
  }

  // ─── Users ─────────────────────────────────────────────────

  async getUsers(type?: string, page?: number, perPage?: number): Promise<any> {
    let response = await this.axios.get(`/users`, {
      params: { type: type || 'AllUsers', page, per_page: perPage }
    });
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.axios.get(`/users/${userId}`);
    return response.data;
  }

  // ─── Organization ─────────────────────────────────────────

  async getOrganization(): Promise<any> {
    let response = await this.axios.get(`/org`);
    return response.data;
  }

  // ─── Notifications ─────────────────────────────────────────

  async enableNotifications(
    notifyUrl: string,
    events: string[],
    channelId: string,
    token?: string,
    channelExpiry?: string
  ): Promise<any> {
    let body: Record<string, any> = {
      watch: [
        {
          notify_url: notifyUrl,
          channel_id: channelId,
          events,
          token: token || 'slates_verification'
        }
      ]
    };
    if (channelExpiry) {
      body.watch[0].channel_expiry = channelExpiry;
    }
    let response = await this.axios.post(`/actions/watch`, body);
    return response.data;
  }

  async disableNotifications(channelIds: string[]): Promise<any> {
    let response = await this.axios.delete(`/actions/watch`, {
      params: { channel_ids: channelIds.join(',') }
    });
    return response.data;
  }

  async getNotifications(channelId?: string, module?: string): Promise<any> {
    let response = await this.axios.get(`/actions/watch`, {
      params: { channel_id: channelId, module }
    });
    return response.data;
  }
}
