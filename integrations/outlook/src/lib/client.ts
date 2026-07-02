import { createAxios } from 'slates';
import type {
  Attachment,
  Attendee,
  Calendar,
  CalendarEvent,
  ChecklistItem,
  Contact,
  ContactFolder,
  DateTimeTimeZone,
  GraphListResponse,
  ItemBody,
  Location,
  MailFolder,
  MeetingTimeSuggestion,
  Message,
  PatternedRecurrence,
  Recipient,
  Subscription,
  TodoTask,
  TodoTaskList
} from './types';

export class Client {
  private axios;

  constructor(config: { token: string }) {
    this.axios = createAxios({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ─── Messages ──────────────────────────────────────────────────────

  async listMessages(params?: {
    folderId?: string;
    top?: number;
    skip?: number;
    filter?: string;
    orderby?: string;
    search?: string;
    select?: string[];
  }): Promise<GraphListResponse<Message>> {
    let basePath = params?.folderId
      ? `/me/mailFolders/${params.folderId}/messages`
      : '/me/messages';

    let queryParams: Record<string, string> = {};
    if (params?.top) queryParams.$top = String(params.top);
    if (params?.skip) queryParams.$skip = String(params.skip);
    if (params?.filter) queryParams.$filter = params.filter;
    if (params?.orderby && !params.search) queryParams.$orderby = params.orderby;
    if (params?.search) queryParams.$search = `"${params.search}"`;
    if (params?.select?.length) queryParams.$select = params.select.join(',');

    let headers: Record<string, string> = {};
    if (params?.search) {
      headers.ConsistencyLevel = 'eventual';
    }

    let response = await this.axios.get(basePath, { params: queryParams, headers });
    return response.data;
  }

  async getMessage(messageId: string, select?: string[]): Promise<Message> {
    let queryParams: Record<string, string> = {};
    if (select?.length) queryParams.$select = select.join(',');
    let response = await this.axios.get(`/me/messages/${messageId}`, { params: queryParams });
    return response.data;
  }

  async sendMessage(message: {
    subject: string;
    body: ItemBody;
    toRecipients: Recipient[];
    ccRecipients?: Recipient[];
    bccRecipients?: Recipient[];
    replyTo?: Recipient[];
    importance?: 'low' | 'normal' | 'high';
    attachments?: Attachment[];
    saveToSentItems?: boolean;
  }): Promise<void> {
    let { saveToSentItems, attachments, ...messageProps } = message;

    let messagePayload: any = { ...messageProps };
    if (attachments?.length) {
      messagePayload.attachments = attachments.map(a => ({
        '@odata.type': '#microsoft.graph.fileAttachment',
        name: a.name,
        contentType: a.contentType,
        contentBytes: a.contentBytes
      }));
    }

    await this.axios.post('/me/sendMail', {
      message: messagePayload,
      saveToSentItems: saveToSentItems !== false
    });
  }

  async createDraft(message: {
    subject?: string;
    body?: ItemBody;
    toRecipients?: Recipient[];
    ccRecipients?: Recipient[];
    bccRecipients?: Recipient[];
    importance?: 'low' | 'normal' | 'high';
  }): Promise<Message> {
    let response = await this.axios.post('/me/messages', message);
    return response.data;
  }

  async updateMessage(
    messageId: string,
    updates: {
      isRead?: boolean;
      importance?: 'low' | 'normal' | 'high';
      categories?: string[];
      flag?: { flagStatus: 'notFlagged' | 'complete' | 'flagged' };
      subject?: string;
      body?: ItemBody;
      toRecipients?: Recipient[];
      ccRecipients?: Recipient[];
      bccRecipients?: Recipient[];
    }
  ): Promise<Message> {
    let response = await this.axios.patch(`/me/messages/${messageId}`, updates);
    return response.data;
  }

  async deleteMessage(messageId: string): Promise<void> {
    await this.axios.delete(`/me/messages/${messageId}`);
  }

  async moveMessage(messageId: string, destinationFolderId: string): Promise<Message> {
    let response = await this.axios.post(`/me/messages/${messageId}/move`, {
      destinationId: destinationFolderId
    });
    return response.data;
  }

  async replyToMessage(messageId: string, comment: string, replyAll?: boolean): Promise<void> {
    let endpoint = replyAll ? 'replyAll' : 'reply';
    await this.axios.post(`/me/messages/${messageId}/${endpoint}`, {
      comment
    });
  }

  async forwardMessage(
    messageId: string,
    toRecipients: Recipient[],
    comment?: string
  ): Promise<void> {
    await this.axios.post(`/me/messages/${messageId}/forward`, {
      comment: comment || '',
      toRecipients
    });
  }

  async sendDraft(messageId: string): Promise<void> {
    await this.axios.post(`/me/messages/${messageId}/send`);
  }

  // ─── Mail Folders ──────────────────────────────────────────────────

  async listMailFolders(parentFolderId?: string): Promise<GraphListResponse<MailFolder>> {
    let path = parentFolderId
      ? `/me/mailFolders/${parentFolderId}/childFolders`
      : '/me/mailFolders';
    let response = await this.axios.get(path);
    return response.data;
  }

  async createMailFolder(displayName: string, parentFolderId?: string): Promise<MailFolder> {
    let path = parentFolderId
      ? `/me/mailFolders/${parentFolderId}/childFolders`
      : '/me/mailFolders';
    let response = await this.axios.post(path, { displayName });
    return response.data;
  }

  // ─── Attachments ───────────────────────────────────────────────────

  async listAttachments(messageId: string): Promise<GraphListResponse<Attachment>> {
    let response = await this.axios.get(`/me/messages/${messageId}/attachments`);
    return response.data;
  }

  async addAttachment(
    messageId: string,
    attachment: {
      name: string;
      contentType?: string;
      contentBytes: string;
    }
  ): Promise<Attachment> {
    let response = await this.axios.post(`/me/messages/${messageId}/attachments`, {
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: attachment.name,
      contentType: attachment.contentType,
      contentBytes: attachment.contentBytes
    });
    return response.data;
  }

  // ─── Calendar Events ──────────────────────────────────────────────

  async listEvents(params?: {
    calendarId?: string;
    top?: number;
    skip?: number;
    filter?: string;
    orderby?: string;
    select?: string[];
    startDateTime?: string;
    endDateTime?: string;
  }): Promise<GraphListResponse<CalendarEvent>> {
    let basePath: string;
    let queryParams: Record<string, string> = {};

    if (params?.startDateTime && params?.endDateTime) {
      basePath = params?.calendarId
        ? `/me/calendars/${params.calendarId}/calendarView`
        : '/me/calendarView';
      queryParams.startDateTime = params.startDateTime;
      queryParams.endDateTime = params.endDateTime;
    } else {
      basePath = params?.calendarId
        ? `/me/calendars/${params.calendarId}/events`
        : '/me/events';
    }

    if (params?.top) queryParams.$top = String(params.top);
    if (params?.skip) queryParams.$skip = String(params.skip);
    if (params?.filter) queryParams.$filter = params.filter;
    if (params?.orderby) queryParams.$orderby = params.orderby;
    if (params?.select?.length) queryParams.$select = params.select.join(',');

    let response = await this.axios.get(basePath, { params: queryParams });
    return response.data;
  }

  async getEvent(eventId: string, select?: string[]): Promise<CalendarEvent> {
    let queryParams: Record<string, string> = {};
    if (select?.length) queryParams.$select = select.join(',');
    let response = await this.axios.get(`/me/events/${eventId}`, { params: queryParams });
    return response.data;
  }

  async createEvent(event: {
    subject: string;
    body?: ItemBody;
    start: DateTimeTimeZone;
    end: DateTimeTimeZone;
    location?: Location;
    attendees?: Attendee[];
    isAllDay?: boolean;
    isOnlineMeeting?: boolean;
    onlineMeetingProvider?: string;
    recurrence?: PatternedRecurrence;
    reminderMinutesBeforeStart?: number;
    showAs?: string;
    importance?: string;
    sensitivity?: string;
    categories?: string[];
    calendarId?: string;
  }): Promise<CalendarEvent> {
    let { calendarId, ...eventData } = event;
    let path = calendarId ? `/me/calendars/${calendarId}/events` : '/me/events';
    let response = await this.axios.post(path, eventData);
    return response.data;
  }

  async updateEvent(
    eventId: string,
    updates: {
      subject?: string;
      body?: ItemBody;
      start?: DateTimeTimeZone;
      end?: DateTimeTimeZone;
      location?: Location;
      attendees?: Attendee[];
      isAllDay?: boolean;
      isOnlineMeeting?: boolean;
      recurrence?: PatternedRecurrence;
      reminderMinutesBeforeStart?: number;
      showAs?: string;
      importance?: string;
      sensitivity?: string;
      categories?: string[];
    }
  ): Promise<CalendarEvent> {
    let response = await this.axios.patch(`/me/events/${eventId}`, updates);
    return response.data;
  }

  async deleteEvent(eventId: string): Promise<void> {
    await this.axios.delete(`/me/events/${eventId}`);
  }

  async respondToEvent(
    eventId: string,
    response: 'accept' | 'tentativelyAccept' | 'decline',
    comment?: string,
    sendResponse?: boolean
  ): Promise<void> {
    await this.axios.post(`/me/events/${eventId}/${response}`, {
      comment: comment || '',
      sendResponse: sendResponse !== false
    });
  }

  async findMeetingTimes(params: {
    attendees: { emailAddress: { address: string; name?: string }; type?: string }[];
    timeConstraint: {
      timeslots: { start: DateTimeTimeZone; end: DateTimeTimeZone }[];
    };
    meetingDuration?: string;
    maxCandidates?: number;
    isOrganizerOptional?: boolean;
    minimumAttendeePercentage?: number;
  }): Promise<{
    meetingTimeSuggestions: MeetingTimeSuggestion[];
    emptySuggestionsReason?: string;
  }> {
    let response = await this.axios.post('/me/findMeetingTimes', params);
    return response.data;
  }

  // ─── Calendars ─────────────────────────────────────────────────────

  async listCalendars(): Promise<GraphListResponse<Calendar>> {
    let response = await this.axios.get('/me/calendars');
    return response.data;
  }

  async getCalendar(calendarId: string): Promise<Calendar> {
    let response = await this.axios.get(`/me/calendars/${calendarId}`);
    return response.data;
  }

  async createCalendar(name: string, color?: string): Promise<Calendar> {
    let response = await this.axios.post('/me/calendars', { name, color });
    return response.data;
  }

  async deleteCalendar(calendarId: string): Promise<void> {
    await this.axios.delete(`/me/calendars/${calendarId}`);
  }

  // ─── Contacts ──────────────────────────────────────────────────────

  async listContacts(params?: {
    folderId?: string;
    top?: number;
    skip?: number;
    filter?: string;
    orderby?: string;
    select?: string[];
    search?: string;
  }): Promise<GraphListResponse<Contact>> {
    let basePath = params?.folderId
      ? `/me/contactFolders/${params.folderId}/contacts`
      : '/me/contacts';

    let queryParams: Record<string, string> = {};
    if (params?.top) queryParams.$top = String(params.top);
    if (params?.skip) queryParams.$skip = String(params.skip);
    if (params?.filter) queryParams.$filter = params.filter;
    if (params?.orderby && !params.search) queryParams.$orderby = params.orderby;
    if (params?.select?.length) queryParams.$select = params.select.join(',');
    if (params?.search) queryParams.$search = `"${params.search}"`;

    let headers: Record<string, string> = {};
    if (params?.search) {
      headers.ConsistencyLevel = 'eventual';
    }

    let response = await this.axios.get(basePath, { params: queryParams, headers });
    return response.data;
  }

  async getContact(contactId: string, select?: string[]): Promise<Contact> {
    let queryParams: Record<string, string> = {};
    if (select?.length) queryParams.$select = select.join(',');
    let response = await this.axios.get(`/me/contacts/${contactId}`, { params: queryParams });
    return response.data;
  }

  async createContact(contact: {
    givenName?: string;
    surname?: string;
    displayName?: string;
    emailAddresses?: { address: string; name?: string }[];
    businessPhones?: string[];
    homePhones?: string[];
    mobilePhone?: string;
    jobTitle?: string;
    companyName?: string;
    department?: string;
    businessAddress?: {
      street?: string;
      city?: string;
      state?: string;
      countryOrRegion?: string;
      postalCode?: string;
    };
    homeAddress?: {
      street?: string;
      city?: string;
      state?: string;
      countryOrRegion?: string;
      postalCode?: string;
    };
    birthday?: string;
    personalNotes?: string;
    categories?: string[];
    folderId?: string;
  }): Promise<Contact> {
    let { folderId, ...contactData } = contact;
    let path = folderId ? `/me/contactFolders/${folderId}/contacts` : '/me/contacts';
    let response = await this.axios.post(path, contactData);
    return response.data;
  }

  async updateContact(
    contactId: string,
    updates: {
      givenName?: string;
      surname?: string;
      displayName?: string;
      emailAddresses?: { address: string; name?: string }[];
      businessPhones?: string[];
      homePhones?: string[];
      mobilePhone?: string;
      jobTitle?: string;
      companyName?: string;
      department?: string;
      businessAddress?: {
        street?: string;
        city?: string;
        state?: string;
        countryOrRegion?: string;
        postalCode?: string;
      };
      homeAddress?: {
        street?: string;
        city?: string;
        state?: string;
        countryOrRegion?: string;
        postalCode?: string;
      };
      birthday?: string;
      personalNotes?: string;
      categories?: string[];
    }
  ): Promise<Contact> {
    let response = await this.axios.patch(`/me/contacts/${contactId}`, updates);
    return response.data;
  }

  async deleteContact(contactId: string): Promise<void> {
    await this.axios.delete(`/me/contacts/${contactId}`);
  }

  async listContactFolders(): Promise<GraphListResponse<ContactFolder>> {
    let response = await this.axios.get('/me/contactFolders');
    return response.data;
  }

  async createContactFolder(
    displayName: string,
    parentFolderId?: string
  ): Promise<ContactFolder> {
    let path = parentFolderId
      ? `/me/contactFolders/${parentFolderId}/childFolders`
      : '/me/contactFolders';
    let response = await this.axios.post(path, { displayName });
    return response.data;
  }

  // ─── Tasks (To Do) ────────────────────────────────────────────────

  async listTaskLists(): Promise<GraphListResponse<TodoTaskList>> {
    let response = await this.axios.get('/me/todo/lists');
    return response.data;
  }

  async getTaskList(listId: string): Promise<TodoTaskList> {
    let response = await this.axios.get(`/me/todo/lists/${listId}`);
    return response.data;
  }

  async createTaskList(displayName: string): Promise<TodoTaskList> {
    let response = await this.axios.post('/me/todo/lists', { displayName });
    return response.data;
  }

  async updateTaskList(listId: string, displayName: string): Promise<TodoTaskList> {
    let response = await this.axios.patch(`/me/todo/lists/${listId}`, { displayName });
    return response.data;
  }

  async deleteTaskList(listId: string): Promise<void> {
    await this.axios.delete(`/me/todo/lists/${listId}`);
  }

  async listTasks(
    listId: string,
    params?: {
      top?: number;
      skip?: number;
      filter?: string;
      orderby?: string;
    }
  ): Promise<GraphListResponse<TodoTask>> {
    let queryParams: Record<string, string> = {};
    if (params?.top) queryParams.$top = String(params.top);
    if (params?.skip) queryParams.$skip = String(params.skip);
    if (params?.filter) queryParams.$filter = params.filter;
    if (params?.orderby) queryParams.$orderby = params.orderby;

    let response = await this.axios.get(`/me/todo/lists/${listId}/tasks`, {
      params: queryParams
    });
    return response.data;
  }

  async getTask(listId: string, taskId: string): Promise<TodoTask> {
    let response = await this.axios.get(`/me/todo/lists/${listId}/tasks/${taskId}`);
    return response.data;
  }

  async createTask(
    listId: string,
    task: {
      title: string;
      body?: ItemBody;
      importance?: 'low' | 'normal' | 'high';
      status?: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred';
      dueDateTime?: DateTimeTimeZone;
      reminderDateTime?: DateTimeTimeZone;
      isReminderOn?: boolean;
      categories?: string[];
      recurrence?: PatternedRecurrence;
    }
  ): Promise<TodoTask> {
    let response = await this.axios.post(`/me/todo/lists/${listId}/tasks`, task);
    return response.data;
  }

  async updateTask(
    listId: string,
    taskId: string,
    updates: {
      title?: string;
      body?: ItemBody;
      importance?: 'low' | 'normal' | 'high';
      status?: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred';
      dueDateTime?: DateTimeTimeZone | null;
      reminderDateTime?: DateTimeTimeZone | null;
      isReminderOn?: boolean;
      categories?: string[];
      recurrence?: PatternedRecurrence | null;
    }
  ): Promise<TodoTask> {
    let response = await this.axios.patch(`/me/todo/lists/${listId}/tasks/${taskId}`, updates);
    return response.data;
  }

  async deleteTask(listId: string, taskId: string): Promise<void> {
    await this.axios.delete(`/me/todo/lists/${listId}/tasks/${taskId}`);
  }

  async listChecklistItems(
    listId: string,
    taskId: string
  ): Promise<GraphListResponse<ChecklistItem>> {
    let response = await this.axios.get(
      `/me/todo/lists/${listId}/tasks/${taskId}/checklistItems`
    );
    return response.data;
  }

  async createChecklistItem(
    listId: string,
    taskId: string,
    displayName: string
  ): Promise<ChecklistItem> {
    let response = await this.axios.post(
      `/me/todo/lists/${listId}/tasks/${taskId}/checklistItems`,
      { displayName }
    );
    return response.data;
  }

  async updateChecklistItem(
    listId: string,
    taskId: string,
    checklistItemId: string,
    updates: {
      displayName?: string;
      isChecked?: boolean;
    }
  ): Promise<ChecklistItem> {
    let response = await this.axios.patch(
      `/me/todo/lists/${listId}/tasks/${taskId}/checklistItems/${checklistItemId}`,
      updates
    );
    return response.data;
  }

  async deleteChecklistItem(
    listId: string,
    taskId: string,
    checklistItemId: string
  ): Promise<void> {
    await this.axios.delete(
      `/me/todo/lists/${listId}/tasks/${taskId}/checklistItems/${checklistItemId}`
    );
  }

  // ─── Subscriptions (Webhooks) ──────────────────────────────────────

  async createSubscription(subscription: {
    changeType: string;
    notificationUrl: string;
    resource: string;
    expirationDateTime: string;
    clientState?: string;
  }): Promise<Subscription> {
    let response = await this.axios.post('/subscriptions', subscription);
    return response.data;
  }

  async updateSubscription(
    subscriptionId: string,
    expirationDateTime: string
  ): Promise<Subscription> {
    let response = await this.axios.patch(`/subscriptions/${subscriptionId}`, {
      expirationDateTime
    });
    return response.data;
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    await this.axios.delete(`/subscriptions/${subscriptionId}`);
  }

  async getSubscription(subscriptionId: string): Promise<Subscription> {
    let response = await this.axios.get(`/subscriptions/${subscriptionId}`);
    return response.data;
  }
}
