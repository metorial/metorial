import { createAxios } from 'slates';

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(config: { token: string }) {
    this.http = createAxios({
      baseURL: 'https://api.mixmax.com/v1',
      headers: {
        'X-API-Token': config.token,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Sequences ──

  async listSequences(params?: { next?: string; limit?: number }) {
    let response = await this.http.get('/sequences', { params });
    return response.data;
  }

  async searchSequences(query: string) {
    let response = await this.http.get('/sequences/search', { params: { q: query } });
    return response.data;
  }

  async getSequenceRecipients(
    sequenceId: string,
    params?: { limit?: number; offset?: number }
  ) {
    let response = await this.http.get(`/sequences/${sequenceId}/recipients`, { params });
    return response.data;
  }

  async addRecipientsToSequence(
    sequenceId: string,
    recipients: Array<{ email: string; variables?: Record<string, string> }>
  ) {
    let response = await this.http.post(`/sequences/${sequenceId}/recipients`, recipients);
    return response.data;
  }

  async cancelSequence(sequenceId: string, recipientEmail?: string) {
    let response = await this.http.post(
      `/sequences/${sequenceId}/cancel`,
      recipientEmail ? { email: recipientEmail } : {}
    );
    return response.data;
  }

  async bulkCancelSequences(body: { emails?: string[]; sequenceIds?: string[] }) {
    let response = await this.http.post('/sequences/cancel', body);
    return response.data;
  }

  // ── Sequence Folders ──

  async listSequenceFolders() {
    let response = await this.http.get('/sequencefolders');
    return response.data;
  }

  async getSequencesInFolder(folderId: string) {
    let response = await this.http.get(`/sequencefolders/${folderId}/sequences`);
    return response.data;
  }

  // ── Messages ──

  async listMessages(params?: { next?: string; limit?: number }) {
    let response = await this.http.get('/messages', { params });
    return response.data;
  }

  async getMessage(messageId: string) {
    let response = await this.http.get(`/messages/${messageId}`);
    return response.data;
  }

  async createMessage(message: {
    to?: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    subject?: string;
    body?: string;
    trackingEnabled?: boolean;
    linkTrackingEnabled?: boolean;
    fileTrackingEnabled?: boolean;
    notificationsEnabled?: boolean;
    inReplyTo?: string;
  }) {
    let response = await this.http.post('/messages', message);
    return response.data;
  }

  async updateMessage(messageId: string, updates: Record<string, any>) {
    let response = await this.http.patch(`/messages/${messageId}`, updates);
    return response.data;
  }

  async sendMessage(messageId: string) {
    let response = await this.http.post(`/messages/${messageId}/send`);
    return response.data;
  }

  async sendTestMessage(message: Record<string, any>) {
    let response = await this.http.post('/messages/test', message);
    return response.data;
  }

  async sendEmail(message: {
    to: Array<{ email: string; name?: string }>;
    cc?: Array<{ email: string; name?: string }>;
    bcc?: Array<{ email: string; name?: string }>;
    subject: string;
    body: string;
    trackingEnabled?: boolean;
    linkTrackingEnabled?: boolean;
  }) {
    let response = await this.http.post('/send', message);
    return response.data;
  }

  // ── Snippets (Templates) ──

  async listSnippets(params?: { search?: string; next?: string; limit?: number }) {
    let response = await this.http.get('/snippets', { params });
    return response.data;
  }

  async getSnippet(snippetId: string) {
    let response = await this.http.get(`/snippets/${snippetId}`);
    return response.data;
  }

  async updateSnippet(snippetId: string, updates: Record<string, any>) {
    let response = await this.http.patch(`/snippets/${snippetId}`, updates);
    return response.data;
  }

  async deleteSnippet(snippetId: string) {
    let response = await this.http.delete(`/snippets/${snippetId}`);
    return response.data;
  }

  async sendSnippet(
    snippetId: string,
    sendData: {
      to: Array<{ email: string; name?: string }>;
      cc?: Array<{ email: string; name?: string }>;
      bcc?: Array<{ email: string; name?: string }>;
      variables?: Record<string, string>;
    }
  ) {
    let response = await this.http.post(`/snippets/${snippetId}/send`, sendData);
    return response.data;
  }

  // ── Snippet Tags ──

  async listSnippetTags() {
    let response = await this.http.get('/snippettags');
    return response.data;
  }

  async getSnippetsInTag(tagId: string) {
    let response = await this.http.get(`/snippettags/${tagId}/snippets`);
    return response.data;
  }

  // ── Contacts ──

  async listContacts(params?: {
    search?: string;
    sort?: string;
    sortAscending?: boolean;
    includeShared?: boolean;
    expand?: string;
    next?: string;
    limit?: number;
  }) {
    let response = await this.http.get('/contacts', { params });
    return response.data;
  }

  async getContact(contactId: string, params?: { expand?: string }) {
    let response = await this.http.get(`/contacts/${contactId}`, { params });
    return response.data;
  }

  async createContact(contact: {
    email: string;
    name?: string;
    groups?: string[];
    meta?: Record<string, any>;
    enrich?: boolean;
  }) {
    let response = await this.http.post('/contacts', contact);
    return response.data;
  }

  async updateContact(contactId: string, updates: Record<string, any>) {
    let response = await this.http.patch(`/contacts/${contactId}`, updates);
    return response.data;
  }

  async deleteContact(contactId: string) {
    let response = await this.http.delete(`/contacts/${contactId}`);
    return response.data;
  }

  async searchContacts(query: string) {
    let response = await this.http.get('/contacts/query', { params: { q: query } });
    return response.data;
  }

  // ── Contact Notes ──

  async listContactNotes(contactId: string) {
    let response = await this.http.get(`/contacts/${contactId}/notes`);
    return response.data;
  }

  async createContactNote(contactId: string, text: string) {
    let response = await this.http.post(`/contacts/${contactId}/notes`, { text });
    return response.data;
  }

  async updateContactNote(contactId: string, noteId: string, text: string) {
    let response = await this.http.patch(`/contacts/${contactId}/notes/${noteId}`, { text });
    return response.data;
  }

  async deleteContactNote(contactId: string, noteId: string) {
    let response = await this.http.delete(`/contacts/${contactId}/notes/${noteId}`);
    return response.data;
  }

  // ── Contact Groups ──

  async listContactGroups(params?: { search?: string; expand?: string }) {
    let response = await this.http.get('/contactgroups', { params });
    return response.data;
  }

  async getContactGroup(groupId: string) {
    let response = await this.http.get(`/contactgroups/${groupId}`);
    return response.data;
  }

  async createContactGroup(name: string, contacts?: string[]) {
    let response = await this.http.post('/contactgroups', { name, contacts });
    return response.data;
  }

  async updateContactGroup(groupId: string, updates: Record<string, any>) {
    let response = await this.http.patch(`/contactgroups/${groupId}`, updates);
    return response.data;
  }

  async deleteContactGroup(groupId: string) {
    let response = await this.http.delete(`/contactgroups/${groupId}`);
    return response.data;
  }

  async getContactsInGroup(groupId: string, params?: { next?: string; limit?: number }) {
    let response = await this.http.get(`/contactgroups/${groupId}/contacts`, { params });
    return response.data;
  }

  async addContactsToGroup(groupId: string, contactIds: string[]) {
    let response = await this.http.post(`/contactgroups/${groupId}/contacts`, contactIds);
    return response.data;
  }

  async removeContactFromGroup(groupId: string, contactId: string) {
    let response = await this.http.delete(`/contactgroups/${groupId}/contacts/${contactId}`);
    return response.data;
  }

  // ── Meeting Types ──

  async listMeetingTypes() {
    let response = await this.http.get('/meetingtypes');
    return response.data;
  }

  async getMeetingType(meetingTypeId: string) {
    let response = await this.http.get(`/meetingtypes/${meetingTypeId}`);
    return response.data;
  }

  async createMeetingType(data: Record<string, any>) {
    let response = await this.http.post('/meetingtypes', data);
    return response.data;
  }

  async updateMeetingType(meetingTypeId: string, updates: Record<string, any>) {
    let response = await this.http.patch(`/meetingtypes/${meetingTypeId}`, updates);
    return response.data;
  }

  async deleteMeetingType(meetingTypeId: string) {
    let response = await this.http.delete(`/meetingtypes/${meetingTypeId}`);
    return response.data;
  }

  // ── Meeting Invites ──

  async listMeetingInvites(params?: { next?: string; limit?: number }) {
    let response = await this.http.get('/meetinginvites', { params });
    return response.data;
  }

  async getMeetingInvite(inviteId: string) {
    let response = await this.http.get(`/meetinginvites/${inviteId}`);
    return response.data;
  }

  async deleteMeetingInvite(inviteId: string) {
    let response = await this.http.delete(`/meetinginvites/${inviteId}`);
    return response.data;
  }

  // ── Meeting Summaries & Transcripts ──

  async searchMeetingSummaries(params?: { next?: string; limit?: number }) {
    let response = await this.http.get('/meetings/summaries/search', { params });
    return response.data;
  }

  async getMeetingTranscript(meetingId: string) {
    let response = await this.http.get(`/meetings/transcripts/${meetingId}`);
    return response.data;
  }

  // ── Appointment Links ──

  async getAppointmentLink() {
    let response = await this.http.get('/appointmentlinks/me');
    return response.data;
  }

  async updateAppointmentLink(name: string) {
    let response = await this.http.patch('/appointmentlinks/me', { name });
    return response.data;
  }

  // ── Rules ──

  async listRules() {
    let response = await this.http.get('/rules');
    return response.data;
  }

  async getRule(ruleId: string) {
    let response = await this.http.get(`/rules/${ruleId}`);
    return response.data;
  }

  async createRule(rule: Record<string, any>) {
    let response = await this.http.post('/rules', rule);
    return response.data;
  }

  async updateRule(ruleId: string, updates: Record<string, any>) {
    let response = await this.http.patch(`/rules/${ruleId}`, updates);
    return response.data;
  }

  async deleteRule(ruleId: string) {
    let response = await this.http.delete(`/rules/${ruleId}`);
    return response.data;
  }

  async listRuleActions(ruleId: string) {
    let response = await this.http.get(`/rules/${ruleId}/actions`);
    return response.data;
  }

  async createRuleAction(ruleId: string, action: Record<string, any>) {
    let response = await this.http.post(`/rules/${ruleId}/actions`, action);
    return response.data;
  }

  async updateRuleAction(ruleId: string, actionId: string, updates: Record<string, any>) {
    let response = await this.http.patch(`/rules/${ruleId}/actions/${actionId}`, updates);
    return response.data;
  }

  async deleteRuleAction(ruleId: string, actionId: string) {
    let response = await this.http.delete(`/rules/${ruleId}/actions/${actionId}`);
    return response.data;
  }

  // ── Unsubscribes ──

  async listUnsubscribes(params?: { next?: string; limit?: number }) {
    let response = await this.http.get('/unsubscribes', { params });
    return response.data;
  }

  async addUnsubscribe(email: string) {
    let response = await this.http.post('/unsubscribes', { email });
    return response.data;
  }

  async removeUnsubscribe(email: string) {
    let response = await this.http.delete('/unsubscribes', { data: { email } });
    return response.data;
  }

  // ── Live Feed ──

  async getLiveFeed(params?: {
    query?: string;
    timezone?: string;
    limit?: number;
    offset?: number;
    stats?: boolean;
  }) {
    let response = await this.http.get('/livefeed', { params });
    return response.data;
  }

  async getLiveFeedEvents(params?: {
    query?: string;
    timezone?: string;
    limit?: number;
    offset?: number;
  }) {
    let response = await this.http.get('/livefeed/events', { params });
    return response.data;
  }

  // ── Reports ──

  async getReportData(body: {
    type: string;
    groupBy?: string;
    query?: string;
    fields?: string;
    limit?: number;
    offset?: number;
    sortBy?: string;
    sortDesc?: boolean;
    timezone?: string;
  }) {
    let response = await this.http.post('/reports/data/table', body);
    return response.data;
  }

  // ── Insights Reports ──

  async listInsightsReports() {
    let response = await this.http.get('/insightsreports');
    return response.data;
  }

  async createInsightsReport(data: Record<string, any>) {
    let response = await this.http.post('/insightsreports', data);
    return response.data;
  }

  async updateInsightsReport(reportId: string, updates: Record<string, any>) {
    let response = await this.http.patch(`/insightsreports/${reportId}`, updates);
    return response.data;
  }

  // ── Polls ──

  async listPolls(params?: { next?: string; limit?: number }) {
    let response = await this.http.get('/polls', { params });
    return response.data;
  }

  async getPoll(pollId: string) {
    let response = await this.http.get(`/polls/${pollId}`);
    return response.data;
  }

  // ── Q&A ──

  async listQA(params?: { next?: string; limit?: number }) {
    let response = await this.http.get('/qa', { params });
    return response.data;
  }

  async getQA(qaId: string) {
    let response = await this.http.get(`/qa/${qaId}`);
    return response.data;
  }

  // ── Yes/No ──

  async listYesNo(params?: { next?: string; limit?: number }) {
    let response = await this.http.get('/yesno', { params });
    return response.data;
  }

  async getYesNo(yesnoId: string) {
    let response = await this.http.get(`/yesno/${yesnoId}`);
    return response.data;
  }

  // ── File Requests ──

  async listFileRequests(params?: { next?: string; limit?: number }) {
    let response = await this.http.get('/filerequests', { params });
    return response.data;
  }

  async getFileRequest(fileRequestId: string) {
    let response = await this.http.get(`/filerequests/${fileRequestId}`);
    return response.data;
  }

  // ── Teams ──

  async listTeams() {
    let response = await this.http.get('/teams');
    return response.data;
  }

  async getTeam(teamId: string) {
    let response = await this.http.get(`/teams/${teamId}`);
    return response.data;
  }

  async createTeam(data: { name: string }) {
    let response = await this.http.post('/teams', data);
    return response.data;
  }

  async updateTeam(teamId: string, updates: Record<string, any>) {
    let response = await this.http.patch(`/teams/${teamId}`, updates);
    return response.data;
  }

  async deleteTeam(teamId: string) {
    let response = await this.http.delete(`/teams/${teamId}`);
    return response.data;
  }

  async listTeamMembers(teamId: string) {
    let response = await this.http.get(`/teams/${teamId}/members`);
    return response.data;
  }

  async addTeamMember(teamId: string, member: { email?: string; userId?: string }) {
    let response = await this.http.post(`/teams/${teamId}/members`, member);
    return response.data;
  }

  async removeTeamMember(teamId: string, memberId: string) {
    let response = await this.http.delete(`/teams/${teamId}/members/${memberId}`);
    return response.data;
  }

  // ── Users ──

  async getCurrentUser() {
    let response = await this.http.get('/users/me');
    return response.data;
  }

  // ── User Preferences ──

  async getUserPreferences() {
    let response = await this.http.get('/userpreferences/me');
    return response.data;
  }

  async updateUserPreferences(updates: Record<string, any>) {
    let response = await this.http.patch('/userpreferences/me', updates);
    return response.data;
  }

  // ── Salesforce ──

  async searchSalesforce(query: string) {
    let response = await this.http.get('/salesforce/search', { params: { q: query } });
    return response.data;
  }

  async getSalesforceContactOrLead(email: string) {
    let response = await this.http.get('/salesforce/contactOrLead', { params: { email } });
    return response.data;
  }

  async getSalesforceWho(recordId: string) {
    let response = await this.http.get(`/salesforce/who/${recordId}`);
    return response.data;
  }

  async getSalesforceWhat(recordId: string) {
    let response = await this.http.get(`/salesforce/what/${recordId}`);
    return response.data;
  }

  async createSalesforceRecord(objectType: string, data: Record<string, any>) {
    let response = await this.http.post(`/salesforce/${objectType}`, data);
    return response.data;
  }

  async updateSalesforceRecord(
    objectType: string,
    recordId: string,
    data: Record<string, any>
  ) {
    let response = await this.http.patch(`/salesforce/${objectType}/${recordId}`, data);
    return response.data;
  }

  async getSalesforceSyncedFields(type: string) {
    let response = await this.http.get('/salesforce/syncedFields', { params: { type } });
    return response.data;
  }

  // ── Live Feed Searches ──

  async listLiveFeedSearches() {
    let response = await this.http.get('/livefeedsearches');
    return response.data;
  }

  async createLiveFeedSearch(data: Record<string, any>) {
    let response = await this.http.post('/livefeedsearches', data);
    return response.data;
  }

  async updateLiveFeedSearch(searchId: string, updates: Record<string, any>) {
    let response = await this.http.patch(`/livefeedsearches/${searchId}`, updates);
    return response.data;
  }
}
