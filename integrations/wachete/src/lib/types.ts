export interface WachetAlert {
  type: string;
  value?: string;
  parameters?: {
    compare?: string;
    value?: string;
  };
}

export interface NotificationEndpoint {
  type: string;
  value?: string;
}

export interface WebProxy {
  location: string;
}

export interface UrlFilterValue {
  filter: string;
  type: string;
}

export interface UrlFilter {
  include?: UrlFilterValue[];
  exclude?: UrlFilterValue[];
}

export interface StringKeyValuePair {
  key: string;
  value: string;
}

export interface WachetData {
  lastCheckTimestamp?: string;
  valueChangedTimestamp?: string;
  raw?: string;
  error?: string;
}

export interface Wachet {
  id?: string;
  name?: string;
  method?: string;
  url?: string;
  headers?: StringKeyValuePair[];
  body?: string;
  xPath?: string;
  excludeXPath?: string;
  regex?: string;
  alerts?: WachetAlert[];
  recurrenceInSeconds?: number;
  folderId?: string;
  data?: WachetData;
  notificationEndpoints?: NotificationEndpoint[];
  proxies?: WebProxy[];
  dynamicContent?: boolean;
  ignoreInvalidPages?: boolean;
  collectRawHtml?: boolean;
  jobType?: string;
  crawlingDepth?: number;
  crawlBinaryContent?: boolean;
  urlFilter?: UrlFilter;
  crawlPagesFromAllDomains?: boolean;
  note?: string;
}

export interface Notification {
  id: string;
  type: string;
  current?: string;
  comparand?: string;
  html?: string;
  error?: string;
  timestamp: string;
  serverTime: string;
  taskId: string;
  taskName?: string;
  url?: string;
}

export interface NotificationListResponse {
  data: Notification[];
  continuationToken?: string;
}

export interface DiffElement {
  operation?: number;
  text?: string;
}

export interface DataHistoryItem {
  lastCheckTimestamp: string;
  valueChangedTimestamp?: string;
  raw?: string;
  error?: string;
  diff?: DiffElement[];
}

export interface DataHistoryResponse {
  data: DataHistoryItem[];
  continuationToken?: string;
}

export interface Folder {
  id?: string;
  name?: string;
  parentId?: string;
  count?: number;
  failedCount?: number;
  pausedCount?: number;
}

export interface FolderContentResponse {
  subfolders?: Folder[];
  tasks?: Wachet[];
  path?: Folder[];
  continuationToken?: string;
}

export interface CrawlerPage {
  id?: string;
  name?: string;
  url?: string;
  data?: WachetData;
}
