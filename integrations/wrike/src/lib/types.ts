export interface WrikeTask {
  id: string;
  accountId: string;
  title: string;
  description?: string;
  briefDescription?: string;
  parentIds: string[];
  superParentIds?: string[];
  sharedIds?: string[];
  responsibleIds?: string[];
  status: string;
  importance: string;
  createdDate: string;
  updatedDate: string;
  completedDate?: string;
  dates?: {
    type: string;
    duration?: number;
    start?: string;
    due?: string;
    workOnWeekends?: boolean;
  };
  scope: string;
  authorIds?: string[];
  customStatusId?: string;
  hasAttachments?: boolean;
  attachmentCount?: number;
  permalink?: string;
  priority?: string;
  followedByMe?: boolean;
  followerIds?: string[];
  superTaskIds?: string[];
  subTaskIds?: string[];
  dependencyIds?: string[];
  metadata?: Array<{ key: string; value: string }>;
  customFields?: Array<{ id: string; value: string }>;
}

export interface WrikeFolder {
  id: string;
  accountId: string;
  title: string;
  createdDate?: string;
  updatedDate?: string;
  description?: string;
  briefDescription?: string;
  color?: string;
  sharedIds?: string[];
  parentIds?: string[];
  childIds?: string[];
  superParentIds?: string[];
  scope: string;
  hasAttachments?: boolean;
  attachmentCount?: number;
  permalink?: string;
  workflowId?: string;
  metadata?: Array<{ key: string; value: string }>;
  customFields?: Array<{ id: string; value: string }>;
  customColumnIds?: string[];
  project?: {
    authorId: string;
    ownerIds: string[];
    status: string;
    startDate?: string;
    endDate?: string;
    createdDate?: string;
    completedDate?: string;
  };
}

export interface WrikeComment {
  id: string;
  authorId: string;
  text: string;
  createdDate: string;
  taskId?: string;
  folderId?: string;
}

export interface WrikeContact {
  id: string;
  firstName: string;
  lastName: string;
  type: string;
  profiles?: Array<{
    accountId: string;
    email?: string;
    role?: string;
    external?: boolean;
    admin?: boolean;
    owner?: boolean;
  }>;
  avatarUrl?: string;
  timezone?: string;
  locale?: string;
  deleted?: boolean;
  me?: boolean;
  title?: string;
  companyName?: string;
  phone?: string;
}

export interface WrikeTimelog {
  id: string;
  taskId: string;
  userId: string;
  categoryId?: string;
  hours: number;
  createdDate: string;
  updatedDate: string;
  trackedDate: string;
  comment?: string;
}

export interface WrikeCustomField {
  id: string;
  accountId: string;
  title: string;
  type: string;
  sharedIds?: string[];
  settings?: Record<string, unknown>;
  spaceId?: string;
}

export interface WrikeWorkflow {
  id: string;
  name: string;
  standard: boolean;
  hidden: boolean;
  customStatuses: Array<{
    id: string;
    name: string;
    standardName?: boolean;
    color: string;
    standard?: boolean;
    group: string;
    hidden: boolean;
  }>;
}

export interface WrikeSpace {
  id: string;
  title: string;
  avatarUrl?: string;
  accessType?: string;
  archived?: boolean;
  description?: string;
  guestRoleId?: string;
  defaultProjectWorkflowId?: string;
  defaultTaskWorkflowId?: string;
}

export interface WrikeWebhook {
  id: string;
  accountId: string;
  hookUrl: string;
  status: string;
  events?: string[];
}

export interface WrikeAttachment {
  id: string;
  authorId: string;
  name: string;
  createdDate: string;
  version: number;
  type: string;
  contentType: string;
  size?: number;
  taskId?: string;
  folderId?: string;
  url?: string;
  reviewIds?: string[];
  width?: number;
  height?: number;
  previewUrl?: string;
}

export interface WrikeDependency {
  id: string;
  predecessorId: string;
  successorId: string;
  relationType: string;
}

export interface WrikeApproval {
  id: string;
  taskId?: string;
  folderId?: string;
  authorId: string;
  title?: string;
  description?: string;
  updatedDate: string;
  dueDate?: string;
  decisions: Array<{
    approverId: string;
    status: string;
    updatedDate: string;
    comment?: string;
  }>;
  reviewId?: string;
  status: string;
  attachmentIds?: string[];
  type?: string;
  finishDate?: string;
}

export interface WrikeResponse<T> {
  kind: string;
  data: T[];
}
