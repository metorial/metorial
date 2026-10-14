export interface WachetAlert {
  type: string | number;
  value?: string | null;
  parameters?: {
    compare?: string | number | null;
    value?: string | null;
  };
}

export interface NotificationEndpoint {
  type: string | number;
  value?: string | null;
}

export interface WebProxy {
  location: string | null;
}

export interface UrlFilterValue {
  filter: string;
  type: string | number;
}

export interface UrlFilter {
  include?: UrlFilterValue[] | null;
  exclude?: UrlFilterValue[] | null;
}

export interface StringKeyValuePair {
  key: string;
  value: string;
}

export interface WachetData {
  lastCheckTimestamp?: string | null;
  valueChangedTimestamp?: string | null;
  raw?: string | null;
  error?: string | null;
}

export interface Wachet {
  id?: string | null;
  name?: string | null;
  method?: string | null;
  url?: string | null;
  headers?: StringKeyValuePair[] | null;
  body?: string | null;
  xPath?: string | null;
  excludeXPath?: string | null;
  regex?: string | null;
  alerts?: WachetAlert[] | null;
  recurrenceInSeconds?: number | null;
  folderId?: string | null;
  data?: WachetData | null;
  notificationEndpoints?: NotificationEndpoint[] | null;
  proxies?: WebProxy[] | null;
  dynamicContent?: boolean;
  ignoreInvalidPages?: boolean;
  collectRawHtml?: boolean;
  jobType?: string | number | null;
  crawlingDepth?: number | null;
  crawlBinaryContent?: boolean;
  urlFilter?: UrlFilter | null;
  crawlPagesFromAllDomains?: boolean;
  note?: string | null;
}

export interface Notification {
  id: string | null;
  type: string | number;
  current?: string | null;
  comparand?: string | null;
  html?: string | null;
  error?: string | null;
  timestamp: string;
  serverTime: string;
  taskId: string | null;
  taskName?: string | null;
  url?: string | null;
}

export interface NotificationListResponse {
  data: Notification[] | null;
  continuationToken?: string | null;
}

export interface DiffElement {
  operation?: number | null;
  text?: string | null;
}

export interface DataHistoryItem {
  lastCheckTimestamp: string;
  valueChangedTimestamp?: string | null;
  raw?: string | null;
  error?: string | null;
  diff?: DiffElement[] | null;
}

export interface DataHistoryResponse {
  data: DataHistoryItem[] | null;
  continuationToken?: string | null;
}

export interface Folder {
  id?: string | null;
  name?: string | null;
  parentId?: string | null;
  count?: number | null;
  failedCount?: number | null;
  pausedCount?: number | null;
}

export interface FolderContentResponse {
  subfolders?: Folder[] | null;
  tasks?: Wachet[] | null;
  path?: Folder[] | null;
  continuationToken?: string | null;
}

export interface CrawlerPage {
  id?: string | null;
  name?: string | null;
  url?: string | null;
  data?: WachetData | null;
}

export interface NotificationContent {
  jobType?: string | number | null;
  syntheticExpression?: string | null;
  url?: string | null;
  name?: string | null;
  html?: string | null;
  timestampUtc?: string;
}
