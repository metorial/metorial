// Azure DevOps API response types

export interface AzureRepository {
  id: string;
  name: string;
  url: string;
  webUrl: string;
  defaultBranch?: string;
  size: number;
  isDisabled?: boolean;
  isFork?: boolean;
  parentRepository?: {
    id: string;
    name: string;
    project: { id: string; name: string };
  };
  project: {
    id: string;
    name: string;
    state: string;
  };
  remoteUrl?: string;
  sshUrl?: string;
}

export interface AzureRef {
  name: string;
  objectId: string;
  creator?: AzureIdentity;
  url?: string;
}

export interface AzureRefUpdateResult extends AzureRef {
  newObjectId?: string;
}

export interface AzureIdentity {
  displayName: string;
  id: string;
  uniqueName?: string;
  imageUrl?: string;
}

export interface AzurePullRequest {
  pullRequestId: number;
  title: string;
  description?: string;
  status: string;
  createdBy: AzureIdentity;
  creationDate: string;
  closedDate?: string;
  sourceRefName: string;
  targetRefName: string;
  mergeStatus?: string;
  isDraft?: boolean;
  autoCompleteSetBy?: AzureIdentity;
  completionOptions?: {
    mergeStrategy?: string;
    deleteSourceBranch?: boolean;
    squashMerge?: boolean;
    mergeCommitMessage?: string;
  };
  reviewers?: AzureReviewer[];
  repository: {
    id: string;
    name: string;
    project: { id: string; name: string };
  };
  url: string;
  labels?: Array<{ id: string; name: string; active: boolean }>;
  lastMergeSourceCommit?: { commitId: string };
  lastMergeTargetCommit?: { commitId: string };
  lastMergeCommit?: { commitId: string };
}

export interface AzureReviewer {
  displayName: string;
  id: string;
  uniqueName?: string;
  vote: number;
  isRequired?: boolean;
  hasDeclined?: boolean;
  isFlagged?: boolean;
}

export interface AzureCommit {
  commitId: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  comment: string;
  commentTruncated?: boolean;
  changeCounts?: {
    Add: number;
    Edit: number;
    Delete: number;
  };
  url: string;
  parents?: string[];
}

export interface AzurePush {
  pushId: number;
  date: string;
  pushedBy: AzureIdentity;
  repository: { id: string; name: string };
  refUpdates: Array<{
    name: string;
    oldObjectId: string;
    newObjectId: string;
  }>;
  commits: AzureCommit[];
  url: string;
}

export interface AzureItem {
  objectId: string;
  gitObjectType: string;
  commitId: string;
  path: string;
  isFolder?: boolean;
  url: string;
  content?: string;
}

export interface AzureCommentThread {
  id: number;
  publishedDate: string;
  lastUpdatedDate: string;
  comments: AzureComment[];
  status?: string;
  threadContext?: {
    filePath?: string;
    rightFileStart?: { line: number; offset: number };
    rightFileEnd?: { line: number; offset: number };
  };
  properties?: Record<string, any>;
}

export interface AzureComment {
  id: number;
  parentCommentId?: number;
  author: AzureIdentity;
  content: string;
  publishedDate: string;
  lastUpdatedDate: string;
  commentType: string;
}

export interface AzureBranchStats {
  name: string;
  aheadCount: number;
  behindCount: number;
  commit: AzureCommit;
  isBaseVersion: boolean;
}

export interface AzureListResponse<T> {
  count: number;
  value: T[];
}

export interface AzureServiceHookSubscription {
  id?: string;
  publisherId: string;
  eventType: string;
  consumerId: string;
  consumerActionId: string;
  publisherInputs: Record<string, string>;
  consumerInputs: Record<string, string>;
  status?: string;
}
