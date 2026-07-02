import { createAxios } from 'slates';

export class Client {
  private axios;

  constructor(private config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://app.helpwise.io/dev-apis/v1'
    });
  }

  private get headers() {
    return {
      Authorization: this.config.token,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    };
  }

  // ---- Mailboxes ----

  async listMailboxes(params?: { limit?: number; page?: number }) {
    let response = await this.axios.request({
      method: 'GET',
      url: '/mailboxes',
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getMailbox(mailboxId: string) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/mailboxes/${mailboxId}`,
      headers: this.headers
    });
    return response.data;
  }

  async createMailbox(data: { email: string; display_name: string; [key: string]: any }) {
    let response = await this.axios.request({
      method: 'POST',
      url: '/mailboxes',
      headers: this.headers,
      data
    });
    return response.data;
  }

  async updateMailbox(mailboxId: string, data: Record<string, any>) {
    let response = await this.axios.request({
      method: 'PUT',
      url: `/mailboxes/${mailboxId}`,
      headers: this.headers,
      data
    });
    return response.data;
  }

  async deleteMailbox(mailboxId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/mailboxes/${mailboxId}`,
      headers: this.headers
    });
    return response.data;
  }

  // ---- Conversations ----

  async listConversations(params?: {
    mailbox_id?: string;
    status?: string;
    limit?: number;
    page?: number;
    tag_id?: string;
    query?: string;
  }) {
    let response = await this.axios.request({
      method: 'GET',
      url: '/conversations',
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getConversation(conversationId: string, params?: { mailbox_id?: string }) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/conversations/${conversationId}`,
      headers: this.headers,
      params
    });
    return response.data;
  }

  async deleteConversation(conversationId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/conversations/${conversationId}`,
      headers: this.headers
    });
    return response.data;
  }

  // ---- Messages / Emails ----

  async listMessages(params: {
    mailbox_id: string;
    thread_id: string;
    limit?: number;
    page?: number;
  }) {
    let response = await this.axios.request({
      method: 'GET',
      url: '/messages',
      headers: this.headers,
      params
    });
    return response.data;
  }

  async sendEmail(data: {
    mailbox_id: string;
    to: string;
    subject: string;
    body: string;
    cc?: string;
    bcc?: string;
    thread_id?: string;
    [key: string]: any;
  }) {
    let response = await this.axios.request({
      method: 'POST',
      url: '/messages',
      headers: this.headers,
      data
    });
    return response.data;
  }

  async updateMessage(messageId: string, data: Record<string, any>) {
    let response = await this.axios.request({
      method: 'PUT',
      url: `/messages/${messageId}`,
      headers: this.headers,
      data
    });
    return response.data;
  }

  async deleteMessage(messageId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/messages/${messageId}`,
      headers: this.headers
    });
    return response.data;
  }

  // ---- Contacts ----

  async listContacts(params?: { limit?: number; page?: number }) {
    let response = await this.axios.request({
      method: 'GET',
      url: '/contacts',
      headers: this.headers,
      params
    });
    return response.data;
  }

  async getContact(contactId: string) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/contacts/${contactId}`,
      headers: this.headers
    });
    return response.data;
  }

  async createContact(data: {
    email?: string;
    phone?: string;
    name?: string;
    [key: string]: any;
  }) {
    let response = await this.axios.request({
      method: 'POST',
      url: '/contacts',
      headers: this.headers,
      data
    });
    return response.data;
  }

  async updateContact(contactId: string, data: Record<string, any>) {
    let response = await this.axios.request({
      method: 'PUT',
      url: `/contacts/${contactId}`,
      headers: this.headers,
      data
    });
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/contacts/${contactId}`,
      headers: this.headers
    });
    return response.data;
  }

  async searchContacts(params: { query: string; limit?: number; page?: number }) {
    let response = await this.axios.request({
      method: 'GET',
      url: '/contacts/search',
      headers: this.headers,
      params
    });
    return response.data;
  }

  // ---- Notes ----

  async listNotes(conversationId: string) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/conversations/${conversationId}/notes`,
      headers: this.headers
    });
    return response.data;
  }

  async addNote(
    conversationId: string,
    data: { body: string; mailbox_id?: string; [key: string]: any }
  ) {
    let response = await this.axios.request({
      method: 'POST',
      url: `/conversations/${conversationId}/notes`,
      headers: this.headers,
      data
    });
    return response.data;
  }

  async deleteNote(conversationId: string, noteId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/conversations/${conversationId}/notes/${noteId}`,
      headers: this.headers
    });
    return response.data;
  }

  // ---- Attachments ----

  async getConversationAttachments(conversationId: string) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/conversations/${conversationId}/attachments`,
      headers: this.headers
    });
    return response.data;
  }

  async getAttachment(attachmentId: string) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/attachments/${attachmentId}`,
      headers: this.headers
    });
    return response.data;
  }

  async createAttachment(data: {
    conversation_id: string;
    file_url?: string;
    file_name?: string;
    [key: string]: any;
  }) {
    let response = await this.axios.request({
      method: 'POST',
      url: '/attachments',
      headers: this.headers,
      data
    });
    return response.data;
  }

  // ---- Tags ----

  async listTags() {
    let response = await this.axios.request({
      method: 'GET',
      url: '/tags',
      headers: this.headers
    });
    return response.data;
  }

  async getTag(tagId: string) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/tags/${tagId}`,
      headers: this.headers
    });
    return response.data;
  }

  async updateTag(tagId: string, data: Record<string, any>) {
    let response = await this.axios.request({
      method: 'PUT',
      url: `/tags/${tagId}`,
      headers: this.headers,
      data
    });
    return response.data;
  }

  async deleteTag(tagId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/tags/${tagId}`,
      headers: this.headers
    });
    return response.data;
  }

  // ---- Teams ----

  async listTeams() {
    let response = await this.axios.request({
      method: 'GET',
      url: '/teams',
      headers: this.headers
    });
    return response.data;
  }

  async getTeam(teamId: string) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/teams/${teamId}`,
      headers: this.headers
    });
    return response.data;
  }

  // ---- Users ----

  async listUsers() {
    let response = await this.axios.request({
      method: 'GET',
      url: '/users',
      headers: this.headers
    });
    return response.data;
  }

  async getMe() {
    let response = await this.axios.request({
      method: 'GET',
      url: '/users/me',
      headers: this.headers
    });
    return response.data;
  }

  // ---- Templates ----

  async listTemplates() {
    let response = await this.axios.request({
      method: 'GET',
      url: '/templates',
      headers: this.headers
    });
    return response.data;
  }

  async getTemplate(templateId: string) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/templates/${templateId}`,
      headers: this.headers
    });
    return response.data;
  }

  async updateTemplate(templateId: string, data: Record<string, any>) {
    let response = await this.axios.request({
      method: 'PUT',
      url: `/templates/${templateId}`,
      headers: this.headers,
      data
    });
    return response.data;
  }

  async deleteTemplate(templateId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/templates/${templateId}`,
      headers: this.headers
    });
    return response.data;
  }

  // ---- Signatures ----

  async deleteSignature(signatureId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/signatures/${signatureId}`,
      headers: this.headers
    });
    return response.data;
  }

  // ---- Webhooks ----

  async listWebhooks() {
    let response = await this.axios.request({
      method: 'GET',
      url: '/webhooks',
      headers: this.headers
    });
    return response.data;
  }

  async getWebhook(webhookId: string) {
    let response = await this.axios.request({
      method: 'GET',
      url: `/webhooks/${webhookId}`,
      headers: this.headers
    });
    return response.data;
  }

  async createWebhook(data: {
    url: string;
    event_type: string;
    secret_key?: string;
    [key: string]: any;
  }) {
    let response = await this.axios.request({
      method: 'POST',
      url: '/webhooks',
      headers: this.headers,
      data
    });
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    let response = await this.axios.request({
      method: 'DELETE',
      url: `/webhooks/${webhookId}`,
      headers: this.headers
    });
    return response.data;
  }
}
