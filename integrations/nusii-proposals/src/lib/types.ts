export interface NusiiClient {
  raw?: Record<string, unknown>;
  clientId: string;
  email: string;
  name: string;
  surname?: string;
  fullName: string;
  currency: string;
  business?: string;
  locale: string;
  pdfPageSize: string;
  web?: string;
  telephone?: string;
  address?: string;
  city?: string;
  postcode?: string;
  country?: string;
  state?: string;
}

export interface NusiiProposal {
  raw?: Record<string, unknown>;
  proposalId: string;
  title: string;
  accountId: number;
  status: string;
  publicId: string;
  preparedById: number | null;
  clientId: number | null;
  senderId: number | null;
  currency: string;
  archivedAt: string | null;
  sectionIds: string[];
}

export interface NusiiSection {
  raw?: Record<string, unknown>;
  sectionId: string;
  currency: string;
  accountId: number;
  proposalId: number | null;
  templateId: number | null;
  title: string;
  name: string | null;
  body: string | null;
  position: number;
  reusable: boolean;
  sectionType: string;
  createdAt: string;
  updatedAt: string;
  pageBreak: boolean;
  optional: boolean;
  selected: boolean;
  includeTotal: boolean;
  totalInCents: number;
  totalFormatted: string;
  lineItemIds?: string[];
}

export interface NusiiLineItem {
  raw?: Record<string, unknown>;
  lineItemId: string;
  sectionId: number;
  name: string;
  position: number;
  costType: string;
  recurringType: string | null;
  perType: string | null;
  quantity: number | null;
  updatedAt: string;
  createdAt: string;
  currency: string;
  amountInCents: number;
  amountFormatted: string;
  totalInCents: number;
  totalFormatted: string;
}

export interface NusiiTemplate {
  raw?: Record<string, unknown>;
  templateId: string;
  name: string;
  accountId?: number;
  createdAt: string;
  publicTemplate: boolean;
  dummyTemplate?: boolean;
}

export interface NusiiActivity {
  raw?: Record<string, unknown>;
  activityId: string;
  activityType: string;
  ipAddress: string | null;
  additionalFields: Record<string, unknown> | null;
  proposalId: number | null;
  clientId: number | null;
}

export interface NusiiUser {
  raw?: Record<string, unknown>;
  userId: string;
  email: string;
  name: string;
}

export interface NusiiTheme {
  raw?: Record<string, unknown>;
  themeId: string;
  name: string;
}

export interface NusiiWebhookEndpoint {
  raw?: Record<string, unknown>;
  webhookEndpointId: string;
  events: string[];
  targetUrl: string;
}

export interface NusiiAccount {
  raw?: Record<string, unknown>;
  accountId: string;
  company: string;
  currency: string;
  locale?: string;
  theme?: string;
  email?: string;
}

export interface PaginationMeta {
  currentPage: number;
  nextPage: number | null;
  prevPage: number | null;
  totalPages: number;
  totalCount: number;
}

export interface PaginatedResult<T> {
  raw?: Record<string, unknown>;
  items: T[];
  pagination: PaginationMeta;
}
