import { createAxios } from 'slates';

export class AffinityClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.affinity.co',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── People ───────────────────────────────────────────────────────

  async listPersons(params?: {
    term?: string;
    withInteractionDates?: boolean;
    pageSize?: number;
    pageToken?: string;
  }) {
    let response = await this.axios.get('/persons', {
      params: {
        term: params?.term,
        with_interaction_dates: params?.withInteractionDates,
        page_size: params?.pageSize,
        page_token: params?.pageToken
      }
    });
    return response.data;
  }

  async getPerson(personId: number, params?: { withInteractionDates?: boolean }) {
    let response = await this.axios.get(`/persons/${personId}`, {
      params: {
        with_interaction_dates: params?.withInteractionDates
      }
    });
    return response.data;
  }

  async createPerson(data: {
    firstName: string;
    lastName: string;
    emails?: string[];
    organization_ids?: number[];
  }) {
    let response = await this.axios.post('/persons', {
      first_name: data.firstName,
      last_name: data.lastName,
      emails: data.emails,
      organization_ids: data.organization_ids
    });
    return response.data;
  }

  async updatePerson(
    personId: number,
    data: {
      firstName?: string;
      lastName?: string;
      emails?: string[];
      organization_ids?: number[];
    }
  ) {
    let response = await this.axios.put(`/persons/${personId}`, {
      first_name: data.firstName,
      last_name: data.lastName,
      emails: data.emails,
      organization_ids: data.organization_ids
    });
    return response.data;
  }

  async deletePerson(personId: number) {
    let response = await this.axios.delete(`/persons/${personId}`);
    return response.data;
  }

  // ─── Organizations ────────────────────────────────────────────────

  async listOrganizations(params?: {
    term?: string;
    withInteractionDates?: boolean;
    pageSize?: number;
    pageToken?: string;
  }) {
    let response = await this.axios.get('/organizations', {
      params: {
        term: params?.term,
        with_interaction_dates: params?.withInteractionDates,
        page_size: params?.pageSize,
        page_token: params?.pageToken
      }
    });
    return response.data;
  }

  async getOrganization(organizationId: number, params?: { withInteractionDates?: boolean }) {
    let response = await this.axios.get(`/organizations/${organizationId}`, {
      params: {
        with_interaction_dates: params?.withInteractionDates
      }
    });
    return response.data;
  }

  async createOrganization(data: { name: string; domain?: string; person_ids?: number[] }) {
    let response = await this.axios.post('/organizations', {
      name: data.name,
      domain: data.domain,
      person_ids: data.person_ids
    });
    return response.data;
  }

  async updateOrganization(
    organizationId: number,
    data: {
      name?: string;
      domain?: string;
      person_ids?: number[];
    }
  ) {
    let response = await this.axios.put(`/organizations/${organizationId}`, {
      name: data.name,
      domain: data.domain,
      person_ids: data.person_ids
    });
    return response.data;
  }

  async deleteOrganization(organizationId: number) {
    let response = await this.axios.delete(`/organizations/${organizationId}`);
    return response.data;
  }

  // ─── Opportunities ────────────────────────────────────────────────

  async listOpportunities(params?: {
    term?: string;
    listId?: number;
    pageSize?: number;
    pageToken?: string;
  }) {
    let response = await this.axios.get('/opportunities', {
      params: {
        term: params?.term,
        list_id: params?.listId,
        page_size: params?.pageSize,
        page_token: params?.pageToken
      }
    });
    return response.data;
  }

  async getOpportunity(opportunityId: number) {
    let response = await this.axios.get(`/opportunities/${opportunityId}`);
    return response.data;
  }

  async createOpportunity(data: {
    name: string;
    listId: number;
    person_ids?: number[];
    organization_ids?: number[];
  }) {
    let response = await this.axios.post('/opportunities', {
      name: data.name,
      list_id: data.listId,
      person_ids: data.person_ids,
      organization_ids: data.organization_ids
    });
    return response.data;
  }

  async updateOpportunity(
    opportunityId: number,
    data: {
      name?: string;
      person_ids?: number[];
      organization_ids?: number[];
    }
  ) {
    let response = await this.axios.put(`/opportunities/${opportunityId}`, {
      name: data.name,
      person_ids: data.person_ids,
      organization_ids: data.organization_ids
    });
    return response.data;
  }

  async deleteOpportunity(opportunityId: number) {
    let response = await this.axios.delete(`/opportunities/${opportunityId}`);
    return response.data;
  }

  // ─── Lists ────────────────────────────────────────────────────────

  async getLists() {
    let response = await this.axios.get('/lists');
    return response.data;
  }

  async getList(listId: number) {
    let response = await this.axios.get(`/lists/${listId}`);
    return response.data;
  }

  async getListEntries(
    listId: number,
    params?: {
      pageSize?: number;
      pageToken?: string;
    }
  ) {
    let response = await this.axios.get(`/lists/${listId}/list-entries`, {
      params: {
        page_size: params?.pageSize,
        page_token: params?.pageToken
      }
    });
    return response.data;
  }

  async getListEntry(listId: number, listEntryId: number) {
    let response = await this.axios.get(`/lists/${listId}/list-entries/${listEntryId}`);
    return response.data;
  }

  async createListEntry(
    listId: number,
    data: {
      entityId: number;
      entity_type?: number;
      creator_id?: number;
    }
  ) {
    let response = await this.axios.post(`/lists/${listId}/list-entries`, {
      entity_id: data.entityId,
      entity_type: data.entity_type,
      creator_id: data.creator_id
    });
    return response.data;
  }

  async deleteListEntry(listId: number, listEntryId: number) {
    let response = await this.axios.delete(`/lists/${listId}/list-entries/${listEntryId}`);
    return response.data;
  }

  // ─── Fields ───────────────────────────────────────────────────────

  async getFields(params?: {
    listId?: number;
    entityType?: number;
    withModifiedNames?: boolean;
  }) {
    let response = await this.axios.get('/fields', {
      params: {
        list_id: params?.listId,
        entity_type: params?.entityType,
        with_modified_names: params?.withModifiedNames
      }
    });
    return response.data;
  }

  // ─── Field Values ─────────────────────────────────────────────────

  async getFieldValues(params: {
    personId?: number;
    organizationId?: number;
    opportunityId?: number;
    listEntryId?: number;
    fieldId?: number;
  }) {
    let response = await this.axios.get('/field-values', {
      params: {
        person_id: params.personId,
        organization_id: params.organizationId,
        opportunity_id: params.opportunityId,
        list_entry_id: params.listEntryId,
        field_id: params.fieldId
      }
    });
    return response.data;
  }

  async createFieldValue(data: {
    fieldId: number;
    entityId: number;
    value: unknown;
    listEntryId?: number;
  }) {
    let response = await this.axios.post('/field-values', {
      field_id: data.fieldId,
      entity_id: data.entityId,
      value: data.value,
      list_entry_id: data.listEntryId
    });
    return response.data;
  }

  async updateFieldValue(
    fieldValueId: number,
    data: {
      value: unknown;
    }
  ) {
    let response = await this.axios.put(`/field-values/${fieldValueId}`, {
      value: data.value
    });
    return response.data;
  }

  async deleteFieldValue(fieldValueId: number) {
    let response = await this.axios.delete(`/field-values/${fieldValueId}`);
    return response.data;
  }

  async getFieldValueChanges(params: {
    fieldId: number;
    listEntryId?: number;
    entityId?: number;
    action_type?: number;
  }) {
    let response = await this.axios.get('/field-value-changes', {
      params: {
        field_id: params.fieldId,
        list_entry_id: params.listEntryId,
        entity_id: params.entityId,
        action_type: params.action_type
      }
    });
    return response.data;
  }

  // ─── Notes ────────────────────────────────────────────────────────

  async listNotes(params?: {
    personId?: number;
    organizationId?: number;
    opportunityId?: number;
    creatorId?: number;
    pageSize?: number;
    pageToken?: string;
  }) {
    let response = await this.axios.get('/notes', {
      params: {
        person_id: params?.personId,
        organization_id: params?.organizationId,
        opportunity_id: params?.opportunityId,
        creator_id: params?.creatorId,
        page_size: params?.pageSize,
        page_token: params?.pageToken
      }
    });
    return response.data;
  }

  async getNote(noteId: number) {
    let response = await this.axios.get(`/notes/${noteId}`);
    return response.data;
  }

  async createNote(data: {
    personIds?: number[];
    organizationIds?: number[];
    opportunityIds?: number[];
    content: string;
    creatorId?: number;
    createdAt?: string;
  }) {
    let response = await this.axios.post('/notes', {
      person_ids: data.personIds,
      organization_ids: data.organizationIds,
      opportunity_ids: data.opportunityIds,
      content: data.content,
      creator_id: data.creatorId,
      created_at: data.createdAt
    });
    return response.data;
  }

  async updateNote(
    noteId: number,
    data: {
      content?: string;
    }
  ) {
    let response = await this.axios.put(`/notes/${noteId}`, {
      content: data.content
    });
    return response.data;
  }

  async deleteNote(noteId: number) {
    let response = await this.axios.delete(`/notes/${noteId}`);
    return response.data;
  }

  // ─── Interactions ─────────────────────────────────────────────────

  async getInteractions(params?: {
    personId?: number;
    organizationId?: number;
    opportunityId?: number;
    type?: number;
    pageSize?: number;
    pageToken?: string;
  }) {
    let response = await this.axios.get('/interactions', {
      params: {
        person_id: params?.personId,
        organization_id: params?.organizationId,
        opportunity_id: params?.opportunityId,
        type: params?.type,
        page_size: params?.pageSize,
        page_token: params?.pageToken
      }
    });
    return response.data;
  }

  async getInteraction(interactionId: number) {
    let response = await this.axios.get(`/interactions/${interactionId}`);
    return response.data;
  }

  // ─── Relationship Strengths ───────────────────────────────────────

  async getRelationshipStrengths(params: { externalId: number; internalId?: number }) {
    let response = await this.axios.get('/relationship-strengths', {
      params: {
        external_id: params.externalId,
        internal_id: params.internalId
      }
    });
    return response.data;
  }

  // ─── Reminders ────────────────────────────────────────────────────

  async listReminders(params?: {
    personId?: number;
    organizationId?: number;
    opportunityId?: number;
    ownerId?: number;
    pageSize?: number;
    pageToken?: string;
  }) {
    let response = await this.axios.get('/reminders', {
      params: {
        person_id: params?.personId,
        organization_id: params?.organizationId,
        opportunity_id: params?.opportunityId,
        owner_id: params?.ownerId,
        page_size: params?.pageSize,
        page_token: params?.pageToken
      }
    });
    return response.data;
  }

  async getReminder(reminderId: number) {
    let response = await this.axios.get(`/reminders/${reminderId}`);
    return response.data;
  }

  async createReminder(data: {
    personId?: number;
    organizationId?: number;
    opportunityId?: number;
    ownerId: number;
    content: string;
    dueDate: string;
    type?: number;
    resetType?: number;
  }) {
    let response = await this.axios.post('/reminders', {
      person_id: data.personId,
      organization_id: data.organizationId,
      opportunity_id: data.opportunityId,
      owner_id: data.ownerId,
      content: data.content,
      due_date: data.dueDate,
      type: data.type,
      reset_type: data.resetType
    });
    return response.data;
  }

  async updateReminder(
    reminderId: number,
    data: {
      content?: string;
      dueDate?: string;
      status?: number;
      type?: number;
      resetType?: number;
    }
  ) {
    let response = await this.axios.put(`/reminders/${reminderId}`, {
      content: data.content,
      due_date: data.dueDate,
      status: data.status,
      type: data.type,
      reset_type: data.resetType
    });
    return response.data;
  }

  async deleteReminder(reminderId: number) {
    let response = await this.axios.delete(`/reminders/${reminderId}`);
    return response.data;
  }

  // ─── Entity Files ─────────────────────────────────────────────────

  async listEntityFiles(params: {
    personId?: number;
    organizationId?: number;
    opportunityId?: number;
    pageSize?: number;
    pageToken?: string;
  }) {
    let response = await this.axios.get('/entity-files', {
      params: {
        person_id: params.personId,
        organization_id: params.organizationId,
        opportunity_id: params.opportunityId,
        page_size: params.pageSize,
        page_token: params.pageToken
      }
    });
    return response.data;
  }

  async getEntityFile(entityFileId: number) {
    let response = await this.axios.get(`/entity-files/${entityFileId}`);
    return response.data;
  }

  async downloadEntityFile(entityFileId: number) {
    let response = await this.axios.get(`/entity-files/${entityFileId}/download`, {
      responseType: 'arraybuffer'
    });
    return response.data;
  }

  // ─── Webhooks ─────────────────────────────────────────────────────

  async listWebhooks() {
    let response = await this.axios.get('/webhook');
    return response.data;
  }

  async getWebhook(webhookId: number) {
    let response = await this.axios.get(`/webhook/${webhookId}`);
    return response.data;
  }

  async createWebhook(data: { webhookUrl: string; subscriptions: string[] }) {
    let response = await this.axios.post('/webhook', {
      webhook_url: data.webhookUrl,
      subscriptions: data.subscriptions
    });
    return response.data;
  }

  async deleteWebhook(webhookId: number) {
    let response = await this.axios.delete(`/webhook/${webhookId}`);
    return response.data;
  }

  // ─── Who Am I ─────────────────────────────────────────────────────

  async whoAmI() {
    let response = await this.axios.get('/auth/whoami');
    return response.data;
  }
}
