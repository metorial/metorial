export interface GraphListResponse<T> {
  '@odata.context'?: string;
  '@odata.nextLink'?: string;
  '@odata.count'?: number;
  value: T[];
}

export interface EmailAddress {
  name?: string;
  address: string;
}

export interface Recipient {
  emailAddress: EmailAddress;
}

export interface ItemBody {
  contentType: 'text' | 'html';
  content: string;
}

export interface Message {
  id: string;
  subject?: string;
  body?: ItemBody;
  bodyPreview?: string;
  from?: Recipient;
  sender?: Recipient;
  toRecipients?: Recipient[];
  ccRecipients?: Recipient[];
  bccRecipients?: Recipient[];
  receivedDateTime?: string;
  sentDateTime?: string;
  isRead?: boolean;
  isDraft?: boolean;
  importance?: 'low' | 'normal' | 'high';
  hasAttachments?: boolean;
  conversationId?: string;
  parentFolderId?: string;
  webLink?: string;
  flag?: { flagStatus: 'notFlagged' | 'complete' | 'flagged' };
  categories?: string[];
  replyTo?: Recipient[];
}

export interface MailFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
  childFolderCount?: number;
  totalItemCount?: number;
  unreadItemCount?: number;
}

export interface Attachment {
  id?: string;
  '@odata.type'?: string;
  name: string;
  contentType?: string;
  size?: number;
  isInline?: boolean;
  contentBytes?: string;
}

export interface DateTimeTimeZone {
  dateTime: string;
  timeZone: string;
}

export interface Location {
  displayName?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    countryOrRegion?: string;
    postalCode?: string;
  };
}

export interface Attendee {
  emailAddress: EmailAddress;
  type: 'required' | 'optional' | 'resource';
  status?: {
    response?:
      | 'none'
      | 'organizer'
      | 'tentativelyAccepted'
      | 'accepted'
      | 'declined'
      | 'notResponded';
    time?: string;
  };
}

export interface PatternedRecurrence {
  pattern: {
    type:
      | 'daily'
      | 'weekly'
      | 'absoluteMonthly'
      | 'relativeMonthly'
      | 'absoluteYearly'
      | 'relativeYearly';
    interval: number;
    daysOfWeek?: string[];
    dayOfMonth?: number;
    month?: number;
    firstDayOfWeek?: string;
    index?: string;
  };
  range: {
    type: 'endDate' | 'noEnd' | 'numbered';
    startDate: string;
    endDate?: string;
    numberOfOccurrences?: number;
    recurrenceTimeZone?: string;
  };
}

export interface CalendarEvent {
  id: string;
  subject?: string;
  body?: ItemBody;
  bodyPreview?: string;
  start?: DateTimeTimeZone;
  end?: DateTimeTimeZone;
  location?: Location;
  locations?: Location[];
  attendees?: Attendee[];
  organizer?: Recipient;
  isAllDay?: boolean;
  isCancelled?: boolean;
  isOnlineMeeting?: boolean;
  onlineMeetingUrl?: string;
  onlineMeeting?: {
    joinUrl?: string;
  };
  recurrence?: PatternedRecurrence;
  reminderMinutesBeforeStart?: number;
  responseStatus?: {
    response?: string;
    time?: string;
  };
  showAs?: 'free' | 'tentative' | 'busy' | 'oof' | 'workingElsewhere' | 'unknown';
  importance?: 'low' | 'normal' | 'high';
  sensitivity?: 'normal' | 'personal' | 'private' | 'confidential';
  hasAttachments?: boolean;
  webLink?: string;
  categories?: string[];
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  seriesMasterId?: string;
  type?: 'singleInstance' | 'occurrence' | 'exception' | 'seriesMaster';
  calendar?: string;
}

export interface Calendar {
  id: string;
  name: string;
  color?: string;
  isDefaultCalendar?: boolean;
  canEdit?: boolean;
  canShare?: boolean;
  canViewPrivateItems?: boolean;
  owner?: EmailAddress;
}

export interface Contact {
  id: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  emailAddresses?: EmailAddress[];
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
  parentFolderId?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
}

export interface ContactFolder {
  id: string;
  displayName: string;
  parentFolderId?: string;
}

export interface TodoTaskList {
  id: string;
  displayName: string;
  isOwner?: boolean;
  isShared?: boolean;
  wellknownListName?: 'none' | 'defaultList' | 'flaggedEmails' | 'unknownFutureValue';
}

export interface TodoTask {
  id: string;
  title?: string;
  body?: ItemBody;
  importance?: 'low' | 'normal' | 'high';
  status?: 'notStarted' | 'inProgress' | 'completed' | 'waitingOnOthers' | 'deferred';
  isReminderOn?: boolean;
  reminderDateTime?: DateTimeTimeZone;
  dueDateTime?: DateTimeTimeZone;
  completedDateTime?: DateTimeTimeZone;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  categories?: string[];
  recurrence?: PatternedRecurrence;
  checklistItems?: ChecklistItem[];
}

export interface ChecklistItem {
  id?: string;
  displayName: string;
  isChecked?: boolean;
  createdDateTime?: string;
}

export interface Subscription {
  id: string;
  resource: string;
  changeType: string;
  clientState?: string;
  notificationUrl: string;
  expirationDateTime: string;
  applicationId?: string;
  creatorId?: string;
}

export interface ChangeNotification {
  changeType: 'created' | 'updated' | 'deleted';
  clientState?: string;
  resource: string;
  resourceData?: {
    '@odata.type'?: string;
    '@odata.id'?: string;
    '@odata.etag'?: string;
    id: string;
  };
  subscriptionId: string;
  subscriptionExpirationDateTime?: string;
  tenantId?: string;
  encryptedContent?: any;
}

export interface MeetingTimeSuggestion {
  meetingTimeSlot: {
    start: DateTimeTimeZone;
    end: DateTimeTimeZone;
  };
  confidence: number;
  organizerAvailability: string;
  attendeeAvailability?: {
    attendee: { emailAddress: EmailAddress };
    availability: string;
  }[];
  locations?: Location[];
  suggestionReason?: string;
}
