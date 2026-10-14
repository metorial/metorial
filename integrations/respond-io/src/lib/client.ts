import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  pickDefined
} from 'slates';

export let numericId = (value: string, label: string) => {
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) <= 0) {
    throw createApiServiceError(`${label} must be a positive numeric ID.`);
  }
  return Number(value);
};

let contactIdentifier = (type: string, value: string) => {
  if (!value.trim()) throw createApiServiceError('A contact identifier is required.');
  if (type === 'id') numericId(value, 'Contact ID');
  return `${type}:${encodeURIComponent(value)}`;
};

export let nextCursorId = (data: any): string | undefined => {
  let next = data?.pagination?.next;
  if (typeof next === 'string' && next) {
    try {
      return (
        new URL(next, 'https://api.respond.io/v2/').searchParams.get('cursorId') ?? undefined
      );
    } catch {
      throw createApiServiceError('Respond.io returned an invalid pagination URL.');
    }
  }
  let cursor = data?.nextCursorId ?? data?.cursorId;
  return cursor == null ? undefined : String(cursor);
};

export let contactOutput = (contact: any) => ({
  contactId: String(contact.id ?? contact.contactId ?? ''),
  firstName: contact.firstName ?? undefined,
  lastName: contact.lastName ?? undefined,
  email: contact.email ?? undefined,
  phone: contact.phone ?? undefined,
  language: contact.language ?? undefined,
  countryCode: contact.countryCode ?? undefined,
  profilePictureUrl: contact.profilePic ?? contact.profilePictureUrl ?? undefined,
  tags: contact.tags ?? undefined,
  assignee: contact.assignee ?? undefined,
  customFields: Array.isArray(contact.custom_fields)
    ? Object.fromEntries(contact.custom_fields.map((field: any) => [field.name, field.value]))
    : (contact.custom_fields ?? contact.customFields ?? undefined),
  status: contact.status ?? undefined,
  createdAt:
    contact.created_at == null ? (contact.createdAt ?? undefined) : String(contact.created_at)
});

export let messageOutput = (message: any) => ({
  messageId: String(message.messageId ?? message.id ?? ''),
  type: message.message?.type ?? message.type ?? undefined,
  text: message.message?.text ?? message.text ?? undefined,
  direction: message.traffic ?? message.direction ?? undefined,
  channelId: message.channelId == null ? undefined : String(message.channelId),
  createdAt: message.createdAt == null ? undefined : String(message.createdAt),
  status: Array.isArray(message.status)
    ? message.status.at(-1)?.value
    : (message.status ?? undefined)
});

export class Client {
  private axios: ReturnType<typeof createAuthenticatedAxios>;

  constructor(config: { token: string }) {
    if (!config.token.trim())
      throw createApiServiceError('A Respond.io API access token is required.');
    this.axios = createAuthenticatedAxios({
      baseURL: 'https://api.respond.io/v2',
      authHeader: { value: `Bearer ${config.token.trim()}` },
      timeout: 30000,
      errorAdapter: error =>
        buildApiServiceError(error, {
          providerLabel: 'Respond.io',
          reason: 'respond_io_api_error'
        })
    });
  }

  async getContact(identifierType: string, identifierValue: string) {
    return (
      await this.axios.get(`/contact/${contactIdentifier(identifierType, identifierValue)}`)
    ).data;
  }

  async createContact(
    identifierType: string,
    identifierValue: string,
    fields: Record<string, any>
  ) {
    if (!fields.firstName?.trim())
      throw createApiServiceError('Provide firstName when creating a contact.');
    await this.axios.post(
      `/contact/${contactIdentifier(identifierType, identifierValue)}`,
      fields
    );
    return this.getContact(identifierType, identifierValue);
  }

  async updateContact(
    identifierType: string,
    identifierValue: string,
    fields: Record<string, any>
  ) {
    if (Object.keys(fields).length === 0)
      throw createApiServiceError('Provide at least one contact field to update.');
    let response = await this.axios.put(
      `/contact/${contactIdentifier(identifierType, identifierValue)}`,
      fields
    );
    let contactId = response.data?.contactId;
    return contactId == null
      ? this.getContact(identifierType, identifierValue)
      : this.getContact('id', String(contactId));
  }

  async deleteContact(contactId: string) {
    return (await this.axios.delete(`/contact/${contactIdentifier('id', contactId)}`)).data;
  }

  async listContacts(
    filters?: Record<string, any>,
    limit?: number,
    cursorId?: string,
    search?: string,
    timezone = 'UTC'
  ) {
    let convert = (conditions: any[] | undefined) =>
      conditions?.map(condition => {
        let category =
          condition.category ?? (condition.field === 'tag' ? 'contactTag' : 'contactField');
        let operator =
          ({ eq: 'isEqualTo', ne: 'isNotEqualTo' } as Record<string, string>)[
            condition.operator
          ] ?? condition.operator;
        if (category === 'contactTag' && operator === 'isEqualTo') operator = 'hasAnyOf';
        if (
          ![
            'isEqualTo',
            'isNotEqualTo',
            'isTimestampAfter',
            'isTimestampBefore',
            'isTimestampBetween',
            'exists',
            'doesNotExist',
            'isGreaterThan',
            'isLessThan',
            'isBetween',
            'hasAnyOf',
            'hasAllOf',
            'hasNoneOf'
          ].includes(operator)
        ) {
          throw createApiServiceError(
            `Unsupported filter operator "${condition.operator}". Use a documented Respond.io filter operator.`
          );
        }
        return {
          category,
          field:
            category === 'contactTag' || category === 'lifecycle' ? null : condition.field,
          operator,
          value:
            category === 'contactTag' && typeof condition.value === 'string'
              ? [condition.value]
              : condition.value
        };
      });
    let response = await this.axios.post(
      '/contact/list',
      {
        search: search ?? '',
        timezone,
        filter:
          !filters?.and && !filters?.or
            ? { $and: [] }
            : pickDefined({ $and: convert(filters?.and), $or: convert(filters?.or) })
      },
      { params: this.pagination(limit, cursorId) }
    );
    return response.data;
  }

  async mergeContacts(primaryContactId: string, secondaryContactId: string) {
    if (primaryContactId === secondaryContactId)
      throw createApiServiceError('Choose two different contacts to merge.');
    return (
      await this.axios.post('/contact/merge', {
        contactIds: [
          numericId(primaryContactId, 'Primary contact ID'),
          numericId(secondaryContactId, 'Secondary contact ID')
        ]
      })
    ).data;
  }

  async addContactTags(contactId: string, tags: string[]) {
    return (await this.axios.post(`/contact/${contactIdentifier('id', contactId)}/tag`, tags))
      .data;
  }

  async removeContactTags(contactId: string, tags: string[]) {
    return (
      await this.axios.delete(`/contact/${contactIdentifier('id', contactId)}/tag`, {
        data: tags
      })
    ).data;
  }

  async sendMessage(contactId: string, message: Record<string, any>, channelId?: string) {
    return (
      await this.axios.post(`/contact/${contactIdentifier('id', contactId)}/message`, {
        message,
        ...pickDefined({
          channelId: channelId === undefined ? undefined : numericId(channelId, 'Channel ID')
        })
      })
    ).data;
  }

  async getMessage(contactId: string, messageId: string) {
    return (
      await this.axios.get(
        `/contact/${contactIdentifier('id', contactId)}/message/${numericId(messageId, 'Message ID')}`
      )
    ).data;
  }

  async listMessages(contactId: string, limit?: number, cursorId?: string) {
    return (
      await this.axios.get(`/contact/${contactIdentifier('id', contactId)}/message/list`, {
        params: this.pagination(limit, cursorId)
      })
    ).data;
  }

  async listContactChannels(contactId: string, limit?: number, cursorId?: string) {
    return (
      await this.axios.get(`/contact/${contactIdentifier('id', contactId)}/channels`, {
        params: this.pagination(limit, cursorId)
      })
    ).data;
  }

  async listMessageTemplates(channelId: string, limit?: number, cursorId?: string) {
    return (
      await this.axios.get(`/space/channel/${numericId(channelId, 'Channel ID')}/template`, {
        params: this.pagination(limit, cursorId)
      })
    ).data;
  }

  async openConversation(contactId: string) {
    return (
      await this.axios.post(
        `/contact/${contactIdentifier('id', contactId)}/conversation/status`,
        { status: 'open' }
      )
    ).data;
  }

  async closeConversation(contactId: string, category?: string, summary?: string) {
    return (
      await this.axios.post(
        `/contact/${contactIdentifier('id', contactId)}/conversation/status`,
        {
          status: 'close',
          ...pickDefined({ category, summary })
        }
      )
    ).data;
  }

  async assignConversation(contactId: string, assigneeId: number) {
    if (!Number.isSafeInteger(assigneeId) || assigneeId <= 0)
      throw createApiServiceError('Assignee ID must be a positive whole number.');
    return (
      await this.axios.post(
        `/contact/${contactIdentifier('id', contactId)}/conversation/assignee`,
        { assignee: assigneeId }
      )
    ).data;
  }

  async unassignConversation(contactId: string) {
    return (
      await this.axios.post(
        `/contact/${contactIdentifier('id', contactId)}/conversation/assignee`,
        { assignee: null }
      )
    ).data;
  }

  async addComment(contactId: string, text: string) {
    if (!text.trim()) throw createApiServiceError('Provide non-empty comment text.');
    return (
      await this.axios.post(`/contact/${contactIdentifier('id', contactId)}/comment`, { text })
    ).data;
  }

  async getCustomField(customFieldId: string) {
    return (
      await this.axios.get(
        `/space/custom_field/${numericId(customFieldId, 'Custom field ID')}`
      )
    ).data;
  }

  async listCustomFields(limit?: number, cursorId?: string) {
    return (
      await this.axios.get('/space/custom_field', { params: this.pagination(limit, cursorId) })
    ).data;
  }

  async listChannels(limit?: number, cursorId?: string) {
    return (
      await this.axios.get('/space/channel', { params: this.pagination(limit, cursorId) })
    ).data;
  }

  async listUsers(limit?: number, cursorId?: string) {
    return (await this.axios.get('/space/user', { params: this.pagination(limit, cursorId) }))
      .data;
  }

  async getUser(userId: string) {
    return (await this.axios.get(`/space/user/${numericId(userId, 'User ID')}`)).data;
  }

  private pagination(limit?: number, cursorId?: string) {
    if (limit !== undefined && (!Number.isInteger(limit) || limit < 1 || limit > 100))
      throw createApiServiceError('Limit must be a whole number between 1 and 100.');
    if (
      cursorId !== undefined &&
      (!/^\d+$/.test(cursorId) || !Number.isSafeInteger(Number(cursorId)))
    )
      throw createApiServiceError(
        'cursorId must be a non-negative numeric cursor from the previous page.'
      );
    return pickDefined({
      limit,
      cursorId: cursorId === undefined ? undefined : Number(cursorId)
    });
  }
}
