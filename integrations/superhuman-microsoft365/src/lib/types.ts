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
