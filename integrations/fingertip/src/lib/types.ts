export interface PaginationParams {
  cursor?: string;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PageInfo {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startCursor?: string;
  endCursor?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  pageInfo: PageInfo;
}

export interface Site {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  businessType: string | null;
  status: string;
  locationId: string | null;
  homePageId: string | null;
  timeZone: string | null;
  workspaceId: string | null;
  logoMedia: any;
  socialIcons: any;
  overridePlan: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSiteInput {
  name: string;
  slug: string;
  businessType: string;
  description?: string | null;
  status?: string;
  locationId?: string | null;
  homePageId?: string | null;
  timeZone?: string | null;
  workspaceId?: string | null;
}

export interface UpdateSiteInput {
  name?: string;
  slug?: string;
  description?: string | null;
  status?: string;
  locationId?: string | null;
  businessType?: string | null;
  homePageId?: string | null;
  timeZone?: string | null;
  workspaceId?: string | null;
}

export interface Page {
  id: string;
  slug: string;
  name: string | null;
  siteId: string;
  description: string | null;
  pageThemeId: string | null;
  bannerMedia: any;
  logoMedia: any;
  socialIcons: any;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePageInput {
  slug: string;
  name: string;
  siteId: string;
  description?: string | null;
  position?: number;
}

export interface UpdatePageInput {
  slug?: string;
  name?: string | null;
  description?: string | null;
  position?: number;
}

export interface Block {
  id: string;
  pageId: string;
  name: string;
  content: any;
  kind: string | null;
  isComponent: boolean;
  componentBlockId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBlockInput {
  name: string;
  content?: any;
  kind: string | null;
  isComponent?: boolean;
  componentBlockId?: string | null;
}

export interface UpdateBlockInput {
  name?: string;
  content?: any;
  kind?: string | null;
  isComponent?: boolean;
  componentBlockId?: string | null;
}

export interface SiteContact {
  id: string;
  siteId: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  businessName: string | null;
  jobTitle: string | null;
  userId: string | null;
  currency: string | null;
  language: string | null;
  timeZone: string | null;
  source: string | null;
  marketingStatus: string;
  subscribedAt: string | null;
  unsubscribedAt: string | null;
  unsubscribeReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SiteContactItem {
  siteContact: SiteContact;
  rating: number | null;
  formResponsesCount: number;
  appointmentsCount: number;
  ordersCount: number;
  invoicesCount: number;
  quotesCount: number;
  paymentsCount: number;
  paymentAmountInCents: number;
  currency: string;
  tags: { id: string; name: string }[];
}

export interface CreateSiteContactInput {
  email: string;
  siteId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  notes?: string;
  marketingStatus?: string;
}

export interface Booking {
  id: string;
  userId: string | null;
  siteId: string | null;
  eventTypeId: string | null;
  response: any;
  startTime: string;
  endTime: string;
  attendees: any;
  location: string | null;
  status: string;
  destinationCalendarId: string | null;
  cancellationReason: string | null;
  rejectionReason: string | null;
  rescheduledReason: string | null;
  rescheduled: boolean | null;
  fromReschedule: string | null;
  recurringEventId: string | null;
  smsReminderNumber: string | null;
  metadata: any;
  calendarEvent: any;
  isRecorded: boolean;
  title: string | null;
  description: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventType {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  length: number;
  priceInCents: number;
  currency: string;
  locations: any;
  attendanceType: string;
  maxAttendees: number | null;
  requiresConfirmation: boolean;
  hidden: boolean;
  media: any;
  color: string | null;
  metadata: any;
  siteId: string;
  createdAt: string;
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  html: string | null;
  featureImage: any;
  featureImageCaption: string | null;
  isFeatured: boolean;
  metaTitle: string | null;
  metaDescription: string | null;
  status: string;
  siteId: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FormTemplate {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  thankYouMessage: string | null;
  buttonText: string | null;
  formThemeId: string | null;
  bannerMedia: any;
  siteId: string;
  status: string;
  customRecipients: any;
  useCustomRecipients: boolean;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: string;
  currency: string;
  totalInCents: number;
  amountPaidInCents: number;
  amountRemainingInCents: number;
  dueAt: string | null;
  completedAt: string | null;
  memo: string | null;
  footer: string | null;
  siteId: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  priceInCents: number;
  originalPriceInCents: number;
  taxInCents: number;
}

export interface OrderData {
  id: string;
  orderNumber: number;
  status: string;
  totalInCents: number;
  currency: string;
  customerName: string;
  customerEmail: string;
  orderItems: OrderItem[];
  siteId: string;
  createdAt: string;
}

export interface OrderWebhookEvent {
  id: string;
  created: number;
  type: string;
  data: OrderData;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  sites: Site[];
}

export interface PageTheme {
  id: string;
  content: any;
  isComponent: boolean;
  componentPageThemeId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookTrigger {
  eventType: string;
  inputData?: any;
}

export interface Webhook {
  id: string;
  userId: string;
  endpointUrl: string;
  secret: string;
  triggers: {
    id: string;
    webhookId: string;
    eventType: string;
    createdAt: string;
    updatedAt: string;
    inputData: any;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsActivity {
  date: string;
  views: number;
  clicks: number;
}

export interface AnalyticsMetric {
  label: string;
  value: number;
  percentage: number;
}

export interface StoreSummaryItem {
  totalRevenue: number;
  totalCount: number;
  fees: number;
  taxes: number;
  currency: string;
}

export interface SiteAnalytics {
  totalViews: number;
  totalClicks: number;
  activities: AnalyticsActivity[];
  referrers: AnalyticsMetric[];
  devices: AnalyticsMetric[];
  browsers: AnalyticsMetric[];
  cities: AnalyticsMetric[];
  countries: AnalyticsMetric[];
  blocks: { blockId: string; blockType: string; interactions: number }[];
  store?: {
    summary: {
      orders: StoreSummaryItem;
      bookings: StoreSummaryItem;
      invoices: StoreSummaryItem;
      tips: StoreSummaryItem;
      totalSales: StoreSummaryItem;
    };
    stats: {
      totalOrders: number;
      totalProducts: number;
      totalCoupons: number;
      totalQuotes: number;
      totalInvoices: number;
    };
    bestSellers: {
      productId: string;
      productName: string;
      revenue: number;
      unitsSold: number;
    }[];
    hasActiveConnection: boolean;
    hasSalesHistory: boolean;
  };
}
