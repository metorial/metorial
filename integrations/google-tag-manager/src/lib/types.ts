// Google Tag Manager API v2 types

export interface GtmAccount {
  path?: string;
  accountId?: string;
  name?: string;
  shareData?: boolean;
  fingerprint?: string;
  tagManagerUrl?: string;
  features?: Record<string, unknown>;
}

export interface GtmContainer {
  path?: string;
  accountId?: string;
  containerId?: string;
  name?: string;
  domainName?: string[];
  publicId?: string;
  notes?: string;
  usageContext?: string[];
  fingerprint?: string;
  tagManagerUrl?: string;
  taggingServerUrls?: string[];
  features?: Record<string, unknown>;
  tagIds?: string[];
}

export interface GtmWorkspace {
  path?: string;
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  name?: string;
  description?: string;
  fingerprint?: string;
  tagManagerUrl?: string;
}

export interface GtmTag {
  path?: string;
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  tagId?: string;
  name?: string;
  type?: string;
  firingTriggerId?: string[];
  blockingTriggerId?: string[];
  liveOnly?: boolean;
  notes?: string;
  scheduleStartMs?: string;
  scheduleEndMs?: string;
  parameter?: GtmParameter[];
  fingerprint?: string;
  tagManagerUrl?: string;
  parentFolderId?: string;
  paused?: boolean;
  priority?: GtmParameter;
  firingRuleId?: string[];
  blockingRuleId?: string[];
  tagFiringOption?: string;
  setupTag?: GtmSetupTag[];
  teardownTag?: GtmTeardownTag[];
  monitoringMetadata?: GtmParameter;
  monitoringMetadataTagNameKey?: string;
  consentSettings?: Record<string, unknown>;
}

export interface GtmParameter {
  type?: string;
  key?: string;
  value?: string;
  list?: GtmParameter[];
  map?: GtmParameter[];
  isWeakReference?: boolean;
}

export interface GtmSetupTag {
  tagName?: string;
  stopOnSetupFailure?: boolean;
}

export interface GtmTeardownTag {
  tagName?: string;
  stopTeardownOnFailure?: boolean;
}

export interface GtmTrigger {
  path?: string;
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  triggerId?: string;
  name?: string;
  type?: string;
  customEventFilter?: GtmCondition[];
  filter?: GtmCondition[];
  autoEventFilter?: GtmCondition[];
  waitForTags?: GtmParameter;
  checkValidation?: GtmParameter;
  waitForTagsTimeout?: GtmParameter;
  uniqueTriggerId?: GtmParameter;
  eventName?: GtmParameter;
  interval?: GtmParameter;
  limit?: GtmParameter;
  continuousTimeMinMilliseconds?: GtmParameter;
  totalTimeMinMilliseconds?: GtmParameter;
  visiblePercentageMin?: GtmParameter;
  visiblePercentageMax?: GtmParameter;
  horizontalScrollPercentageList?: GtmParameter;
  verticalScrollPercentageList?: GtmParameter;
  selector?: GtmParameter;
  intervalSeconds?: GtmParameter;
  maxTimerLengthSeconds?: GtmParameter;
  parameter?: GtmParameter[];
  fingerprint?: string;
  tagManagerUrl?: string;
  parentFolderId?: string;
  notes?: string;
}

export interface GtmCondition {
  type?: string;
  parameter?: GtmParameter[];
}

export interface GtmVariable {
  path?: string;
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  variableId?: string;
  name?: string;
  type?: string;
  notes?: string;
  parameter?: GtmParameter[];
  enablingTriggerId?: string[];
  disablingTriggerId?: string[];
  fingerprint?: string;
  tagManagerUrl?: string;
  parentFolderId?: string;
  formatValue?: GtmFormatValue;
  scheduleStartMs?: string;
  scheduleEndMs?: string;
}

export interface GtmFormatValue {
  caseConversionType?: string;
  convertNullToValue?: GtmParameter;
  convertUndefinedToValue?: GtmParameter;
  convertTrueToValue?: GtmParameter;
  convertFalseToValue?: GtmParameter;
}

export interface GtmBuiltInVariable {
  path?: string;
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  type?: string;
  name?: string;
}

export interface GtmContainerVersion {
  path?: string;
  accountId?: string;
  containerId?: string;
  containerVersionId?: string;
  name?: string;
  description?: string;
  container?: GtmContainer;
  tag?: GtmTag[];
  trigger?: GtmTrigger[];
  variable?: GtmVariable[];
  folder?: GtmFolder[];
  builtInVariable?: GtmBuiltInVariable[];
  fingerprint?: string;
  tagManagerUrl?: string;
  deleted?: boolean;
  customTemplate?: GtmCustomTemplate[];
  zone?: unknown[];
  client?: unknown[];
  transformation?: unknown[];
}

export interface GtmContainerVersionHeader {
  path?: string;
  accountId?: string;
  containerId?: string;
  containerVersionId?: string;
  name?: string;
  numTags?: string;
  numTriggers?: string;
  numVariables?: string;
  numZones?: string;
  numCustomTemplates?: string;
  numClients?: string;
  numGtagConfigs?: string;
  numTransformations?: string;
  deleted?: boolean;
  numMacros?: string;
  numRules?: string;
}

export interface GtmEnvironment {
  path?: string;
  accountId?: string;
  containerId?: string;
  environmentId?: string;
  name?: string;
  type?: string;
  description?: string;
  enableDebug?: boolean;
  url?: string;
  authorizationCode?: string;
  authorizationTimestamp?: string;
  containerVersionId?: string;
  fingerprint?: string;
  tagManagerUrl?: string;
  workspaceId?: string;
}

export interface GtmFolder {
  path?: string;
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  folderId?: string;
  name?: string;
  notes?: string;
  fingerprint?: string;
  tagManagerUrl?: string;
}

export interface GtmUserPermission {
  path?: string;
  accountId?: string;
  emailAddress?: string;
  accountAccess?: GtmAccountAccess;
  containerAccess?: GtmContainerAccess[];
}

export interface GtmAccountAccess {
  permission?: string;
}

export interface GtmContainerAccess {
  containerId?: string;
  permission?: string;
}

export interface GtmCustomTemplate {
  path?: string;
  accountId?: string;
  containerId?: string;
  workspaceId?: string;
  templateId?: string;
  name?: string;
  fingerprint?: string;
  tagManagerUrl?: string;
  templateData?: string;
  galleryReference?: GtmGalleryReference;
}

export interface GtmGalleryReference {
  host?: string;
  owner?: string;
  repository?: string;
  version?: string;
  signature?: string;
  isModified?: boolean;
}

export interface GtmCreateVersionResponse {
  containerVersion?: GtmContainerVersion;
  newWorkspaceId?: string;
  syncStatus?: GtmSyncStatus;
  compilerError?: boolean;
}

export interface GtmPublishResponse {
  containerVersion?: GtmContainerVersion;
  compilerError?: boolean;
}

export interface GtmSyncStatus {
  mergeConflict?: boolean;
  syncError?: boolean;
}

export interface GtmWorkspaceStatus {
  workspaceChange?: GtmEntity[];
  mergeConflict?: GtmMergeConflict[];
}

export interface GtmEntity {
  tag?: GtmTag;
  trigger?: GtmTrigger;
  variable?: GtmVariable;
  folder?: GtmFolder;
  client?: unknown;
  transformation?: unknown;
  changeStatus?: string;
}

export interface GtmMergeConflict {
  entityInWorkspace?: GtmEntity;
  entityInBaseVersion?: GtmEntity;
}

export interface GtmSnippetResponse {
  snippet?: string;
}

// List response wrappers
export interface ListAccountsResponse {
  account?: GtmAccount[];
  nextPageToken?: string;
}

export interface ListContainersResponse {
  container?: GtmContainer[];
  nextPageToken?: string;
}

export interface ListWorkspacesResponse {
  workspace?: GtmWorkspace[];
  nextPageToken?: string;
}

export interface ListTagsResponse {
  tag?: GtmTag[];
  nextPageToken?: string;
}

export interface ListTriggersResponse {
  trigger?: GtmTrigger[];
  nextPageToken?: string;
}

export interface ListVariablesResponse {
  variable?: GtmVariable[];
  nextPageToken?: string;
}

export interface ListBuiltInVariablesResponse {
  builtInVariable?: GtmBuiltInVariable[];
  nextPageToken?: string;
}

export interface ListVersionHeadersResponse {
  containerVersionHeader?: GtmContainerVersionHeader[];
  nextPageToken?: string;
}

export interface ListEnvironmentsResponse {
  environment?: GtmEnvironment[];
  nextPageToken?: string;
}

export interface ListFoldersResponse {
  folder?: GtmFolder[];
  nextPageToken?: string;
}

export interface ListUserPermissionsResponse {
  userPermission?: GtmUserPermission[];
  nextPageToken?: string;
}

export interface FolderEntitiesResponse {
  tag?: GtmTag[];
  trigger?: GtmTrigger[];
  variable?: GtmVariable[];
  nextPageToken?: string;
}
