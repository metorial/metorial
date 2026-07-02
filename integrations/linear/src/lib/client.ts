import { ServiceError } from '@lowerdeck/error';
import { createAxios } from 'slates';
import { linearApiError } from './errors';

let extractErrorMessage = (error: unknown) => {
  let responseData = (error as any)?.response?.data;
  let errors = responseData?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return errors.map((item: any) => item?.message ?? 'Unknown error').join('; ');
  }

  if (typeof responseData?.message === 'string') {
    return responseData.message;
  }

  if (typeof responseData === 'string' && responseData.trim()) {
    return responseData.trim();
  }

  return error instanceof Error && error.message ? error.message : 'Unknown error';
};

export class LinearClient {
  private axios: ReturnType<typeof createAxios>;

  constructor(token: string) {
    this.axios = createAxios({
      baseURL: 'https://api.linear.app',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  async query<T = any>(queryString: string, variables?: Record<string, any>): Promise<T> {
    try {
      let response = await this.axios.post('/graphql', {
        query: queryString,
        variables
      });

      if (response.data?.errors?.length) {
        let messages = response.data.errors.map((e: any) => e.message).join('; ');
        throw linearApiError(messages);
      }

      return response.data?.data;
    } catch (error) {
      if (error instanceof ServiceError) {
        throw error;
      }

      throw linearApiError(extractErrorMessage(error));
    }
  }

  // ─── Issues ───

  async createIssue(input: Record<string, any>) {
    let data = await this.query(
      `
      mutation IssueCreate($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            ${ISSUE_FIELDS}
          }
        }
      }
    `,
      { input }
    );
    return data.issueCreate;
  }

  async updateIssue(issueId: string, input: Record<string, any>) {
    let data = await this.query(
      `
      mutation IssueUpdate($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            ${ISSUE_FIELDS}
          }
        }
      }
    `,
      { id: issueId, input }
    );
    return data.issueUpdate;
  }

  async deleteIssue(issueId: string) {
    let data = await this.query(
      `
      mutation IssueDelete($id: String!) {
        issueDelete(id: $id) {
          success
        }
      }
    `,
      { id: issueId }
    );
    return data.issueDelete;
  }

  async archiveIssue(issueId: string) {
    let data = await this.query(
      `
      mutation IssueArchive($id: String!) {
        issueArchive(id: $id) {
          success
        }
      }
    `,
      { id: issueId }
    );
    return data.issueArchive;
  }

  async getIssue(issueId: string) {
    let data = await this.query(
      `
      query Issue($id: String!) {
        issue(id: $id) {
          ${ISSUE_FIELDS}
          children {
            nodes {
              id
              identifier
              title
              priority
              state { id name type }
              assignee { id name email }
            }
          }
          comments {
            nodes {
              ${COMMENT_FIELDS}
            }
          }
        }
      }
    `,
      { id: issueId }
    );
    return data.issue;
  }

  async listIssues(params: {
    teamId?: string;
    assigneeId?: string;
    projectId?: string;
    cycleId?: string;
    stateId?: string;
    first?: number;
    after?: string;
    includeArchived?: boolean;
    filter?: Record<string, any>;
  }) {
    let filter: Record<string, any> = params.filter || {};
    if (params.teamId) filter.team = { id: { eq: params.teamId } };
    if (params.assigneeId) filter.assignee = { id: { eq: params.assigneeId } };
    if (params.projectId) filter.project = { id: { eq: params.projectId } };
    if (params.cycleId) filter.cycle = { id: { eq: params.cycleId } };
    if (params.stateId) filter.state = { id: { eq: params.stateId } };

    let data = await this.query(
      `
      query Issues($filter: IssueFilter, $first: Int, $after: String, $includeArchived: Boolean) {
        issues(filter: $filter, first: $first, after: $after, includeArchived: $includeArchived) {
          nodes {
            ${ISSUE_FIELDS}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
      {
        filter: Object.keys(filter).length > 0 ? filter : undefined,
        first: params.first || 50,
        after: params.after,
        includeArchived: params.includeArchived
      }
    );
    return data.issues;
  }

  async searchIssues(
    query: string,
    params?: { first?: number; after?: string; teamId?: string; includeArchived?: boolean }
  ) {
    let filter: Record<string, any> | undefined;
    if (params?.teamId) {
      filter = { team: { id: { eq: params.teamId } } };
    }

    let data = await this.query(
      `
      query IssueSearch($term: String!, $first: Int, $after: String, $includeArchived: Boolean, $filter: IssueFilter) {
        searchIssues(term: $term, first: $first, after: $after, includeArchived: $includeArchived, filter: $filter) {
          nodes {
            ${ISSUE_FIELDS}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
      {
        term: query,
        first: params?.first || 50,
        after: params?.after,
        includeArchived: params?.includeArchived,
        filter
      }
    );
    return data.searchIssues;
  }

  // ─── Projects ───

  async createProject(input: Record<string, any>) {
    let data = await this.query(
      `
      mutation ProjectCreate($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
          success
          project {
            ${PROJECT_FIELDS}
          }
        }
      }
    `,
      { input }
    );
    return data.projectCreate;
  }

  async updateProject(projectId: string, input: Record<string, any>) {
    let data = await this.query(
      `
      mutation ProjectUpdate($id: String!, $input: ProjectUpdateInput!) {
        projectUpdate(id: $id, input: $input) {
          success
          project {
            ${PROJECT_FIELDS}
          }
        }
      }
    `,
      { id: projectId, input }
    );
    return data.projectUpdate;
  }

  async deleteProject(projectId: string) {
    let data = await this.query(
      `
      mutation ProjectDelete($id: String!) {
        projectDelete(id: $id) {
          success
        }
      }
    `,
      { id: projectId }
    );
    return data.projectDelete;
  }

  async getProject(projectId: string) {
    let data = await this.query(
      `
      query Project($id: String!) {
        project(id: $id) {
          ${PROJECT_FIELDS}
          issues {
            nodes {
              id
              identifier
              title
              priority
              state { id name type }
              assignee { id name email }
            }
          }
        }
      }
    `,
      { id: projectId }
    );
    return data.project;
  }

  async listProjects(params?: {
    first?: number;
    after?: string;
    filter?: Record<string, any>;
  }) {
    let data = await this.query(
      `
      query Projects($first: Int, $after: String, $filter: ProjectFilter) {
        projects(first: $first, after: $after, filter: $filter) {
          nodes {
            ${PROJECT_FIELDS}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
      {
        first: params?.first || 50,
        after: params?.after,
        filter: params?.filter
      }
    );
    return data.projects;
  }

  // ─── Cycles ───

  async createCycle(input: Record<string, any>) {
    let data = await this.query(
      `
      mutation CycleCreate($input: CycleCreateInput!) {
        cycleCreate(input: $input) {
          success
          cycle {
            ${CYCLE_FIELDS}
          }
        }
      }
    `,
      { input }
    );
    return data.cycleCreate;
  }

  async updateCycle(cycleId: string, input: Record<string, any>) {
    let data = await this.query(
      `
      mutation CycleUpdate($id: String!, $input: CycleUpdateInput!) {
        cycleUpdate(id: $id, input: $input) {
          success
          cycle {
            ${CYCLE_FIELDS}
          }
        }
      }
    `,
      { id: cycleId, input }
    );
    return data.cycleUpdate;
  }

  async deleteCycle(cycleId: string) {
    let data = await this.query(
      `
      mutation CycleArchive($id: String!) {
        cycleArchive(id: $id) {
          success
        }
      }
    `,
      { id: cycleId }
    );
    return data.cycleArchive;
  }

  async getCycle(cycleId: string) {
    let data = await this.query(
      `
      query Cycle($id: String!) {
        cycle(id: $id) {
          ${CYCLE_FIELDS}
          issues {
            nodes {
              id
              identifier
              title
              priority
              state { id name type }
              assignee { id name email }
            }
          }
        }
      }
    `,
      { id: cycleId }
    );
    return data.cycle;
  }

  async listCycles(params?: {
    teamId?: string;
    first?: number;
    after?: string;
    filter?: Record<string, any>;
  }) {
    let filter: Record<string, any> = params?.filter || {};
    if (params?.teamId) filter.team = { id: { eq: params.teamId } };

    let data = await this.query(
      `
      query Cycles($first: Int, $after: String, $filter: CycleFilter) {
        cycles(first: $first, after: $after, filter: $filter) {
          nodes {
            ${CYCLE_FIELDS}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
      {
        first: params?.first || 50,
        after: params?.after,
        filter: Object.keys(filter).length > 0 ? filter : undefined
      }
    );
    return data.cycles;
  }

  // ─── Teams ───

  async getTeam(teamId: string) {
    let data = await this.query(
      `
      query Team($id: String!) {
        team(id: $id) {
          ${TEAM_FIELDS}
          states {
            nodes {
              id
              name
              type
              color
              position
            }
          }
          labels {
            nodes {
              id
              name
              color
            }
          }
          members {
            nodes {
              id
              name
              email
              displayName
              avatarUrl
              active
            }
          }
        }
      }
    `,
      { id: teamId }
    );
    return data.team;
  }

  async listTeams(params?: { first?: number; after?: string }) {
    let data = await this.query(
      `
      query Teams($first: Int, $after: String) {
        teams(first: $first, after: $after) {
          nodes {
            ${TEAM_FIELDS}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
      {
        first: params?.first || 50,
        after: params?.after
      }
    );
    return data.teams;
  }

  // ─── Comments ───

  async createComment(input: Record<string, any>) {
    let data = await this.query(
      `
      mutation CommentCreate($input: CommentCreateInput!) {
        commentCreate(input: $input) {
          success
          comment {
            ${COMMENT_FIELDS}
          }
        }
      }
    `,
      { input }
    );
    return data.commentCreate;
  }

  async updateComment(commentId: string, input: Record<string, any>) {
    let data = await this.query(
      `
      mutation CommentUpdate($id: String!, $input: CommentUpdateInput!) {
        commentUpdate(id: $id, input: $input) {
          success
          comment {
            ${COMMENT_FIELDS}
          }
        }
      }
    `,
      { id: commentId, input }
    );
    return data.commentUpdate;
  }

  async deleteComment(commentId: string) {
    let data = await this.query(
      `
      mutation CommentDelete($id: String!) {
        commentDelete(id: $id) {
          success
        }
      }
    `,
      { id: commentId }
    );
    return data.commentDelete;
  }

  // ─── Labels ───

  async createLabel(input: Record<string, any>) {
    let data = await this.query(
      `
      mutation IssueLabelCreate($input: IssueLabelCreateInput!) {
        issueLabelCreate(input: $input) {
          success
          issueLabel {
            ${LABEL_FIELDS}
          }
        }
      }
    `,
      { input }
    );
    return data.issueLabelCreate;
  }

  async updateLabel(labelId: string, input: Record<string, any>) {
    let data = await this.query(
      `
      mutation IssueLabelUpdate($id: String!, $input: IssueLabelUpdateInput!) {
        issueLabelUpdate(id: $id, input: $input) {
          success
          issueLabel {
            ${LABEL_FIELDS}
          }
        }
      }
    `,
      { id: labelId, input }
    );
    return data.issueLabelUpdate;
  }

  async deleteLabel(labelId: string) {
    let data = await this.query(
      `
      mutation IssueLabelDelete($id: String!) {
        issueLabelDelete(id: $id) {
          success
        }
      }
    `,
      { id: labelId }
    );
    return data.issueLabelDelete;
  }

  async listLabels(params?: { teamId?: string; first?: number; after?: string }) {
    let filter: Record<string, any> | undefined;
    if (params?.teamId) filter = { team: { id: { eq: params.teamId } } };

    let data = await this.query(
      `
      query IssueLabels($first: Int, $after: String, $filter: IssueLabelFilter) {
        issueLabels(first: $first, after: $after, filter: $filter) {
          nodes {
            ${LABEL_FIELDS}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
      {
        first: params?.first || 50,
        after: params?.after,
        filter
      }
    );
    return data.issueLabels;
  }

  // ─── Documents ───

  async createDocument(input: Record<string, any>) {
    let data = await this.query(
      `
      mutation DocumentCreate($input: DocumentCreateInput!) {
        documentCreate(input: $input) {
          success
          document {
            ${DOCUMENT_FIELDS}
          }
        }
      }
    `,
      { input }
    );
    return data.documentCreate;
  }

  async updateDocument(documentId: string, input: Record<string, any>) {
    let data = await this.query(
      `
      mutation DocumentUpdate($id: String!, $input: DocumentUpdateInput!) {
        documentUpdate(id: $id, input: $input) {
          success
          document {
            ${DOCUMENT_FIELDS}
          }
        }
      }
    `,
      { id: documentId, input }
    );
    return data.documentUpdate;
  }

  async deleteDocument(documentId: string) {
    let data = await this.query(
      `
      mutation DocumentDelete($id: String!) {
        documentDelete(id: $id) {
          success
        }
      }
    `,
      { id: documentId }
    );
    return data.documentDelete;
  }

  async getDocument(documentId: string) {
    let data = await this.query(
      `
      query Document($id: String!) {
        document(id: $id) {
          ${DOCUMENT_FIELDS}
        }
      }
    `,
      { id: documentId }
    );
    return data.document;
  }

  async listDocuments(params?: {
    first?: number;
    after?: string;
    filter?: Record<string, any>;
  }) {
    let data = await this.query(
      `
      query Documents($first: Int, $after: String, $filter: DocumentFilter) {
        documents(first: $first, after: $after, filter: $filter) {
          nodes {
            ${DOCUMENT_FIELDS}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
      {
        first: params?.first || 50,
        after: params?.after,
        filter: params?.filter
      }
    );
    return data.documents;
  }

  // ─── Users ───

  async getViewer() {
    let data = await this.query(`
      query Viewer {
        viewer {
          ${USER_FIELDS}
          organization {
            id
            name
            urlKey
          }
        }
      }
    `);
    return data.viewer;
  }

  async getUser(userId: string) {
    let data = await this.query(
      `
      query User($id: String!) {
        user(id: $id) {
          ${USER_FIELDS}
        }
      }
    `,
      { id: userId }
    );
    return data.user;
  }

  async listUsers(params?: { first?: number; after?: string }) {
    let data = await this.query(
      `
      query Users($first: Int, $after: String) {
        users(first: $first, after: $after) {
          nodes {
            ${USER_FIELDS}
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
      {
        first: params?.first || 50,
        after: params?.after
      }
    );
    return data.users;
  }

  // ─── Workflow States ───

  async listWorkflowStates(params?: { teamId?: string; first?: number; after?: string }) {
    let filter: Record<string, any> | undefined;
    if (params?.teamId) filter = { team: { id: { eq: params.teamId } } };

    let data = await this.query(
      `
      query WorkflowStates($first: Int, $after: String, $filter: WorkflowStateFilter) {
        workflowStates(first: $first, after: $after, filter: $filter) {
          nodes {
            id
            name
            type
            color
            position
            team {
              id
              name
              key
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `,
      {
        first: params?.first || 250,
        after: params?.after,
        filter
      }
    );
    return data.workflowStates;
  }

  // ─── Webhooks ───

  async createWebhook(input: Record<string, any>) {
    let data = await this.query(
      `
      mutation WebhookCreate($input: WebhookCreateInput!) {
        webhookCreate(input: $input) {
          success
          webhook {
            id
            enabled
            url
            secret
            resourceTypes
            allPublicTeams
            team {
              id
              name
            }
          }
        }
      }
    `,
      { input }
    );
    return data.webhookCreate;
  }

  async deleteWebhook(webhookId: string) {
    let data = await this.query(
      `
      mutation WebhookDelete($id: String!) {
        webhookDelete(id: $id) {
          success
        }
      }
    `,
      { id: webhookId }
    );
    return data.webhookDelete;
  }

  // ─── Attachments ───

  async createAttachment(input: Record<string, any>) {
    let data = await this.query(
      `
      mutation AttachmentCreate($input: AttachmentCreateInput!) {
        attachmentCreate(input: $input) {
          success
          attachment {
            id
            title
            subtitle
            url
            metadata
            issue {
              id
              identifier
              title
            }
            createdAt
            updatedAt
          }
        }
      }
    `,
      { input }
    );
    return data.attachmentCreate;
  }

  async deleteAttachment(attachmentId: string) {
    let data = await this.query(
      `
      mutation AttachmentDelete($id: String!) {
        attachmentDelete(id: $id) {
          success
        }
      }
    `,
      { id: attachmentId }
    );
    return data.attachmentDelete;
  }
}

// ─── Field Fragments ───

let ISSUE_FIELDS = `
  id
  identifier
  title
  description
  priority
  priorityLabel
  estimate
  dueDate
  url
  createdAt
  updatedAt
  archivedAt
  canceledAt
  completedAt
  startedAt
  sortOrder
  number
  team {
    id
    name
    key
  }
  state {
    id
    name
    type
    color
  }
  assignee {
    id
    name
    email
    displayName
  }
  creator {
    id
    name
    email
  }
  project {
    id
    name
    url
  }
  cycle {
    id
    name
    number
  }
  parent {
    id
    identifier
    title
  }
  labels {
    nodes {
      id
      name
      color
    }
  }
`;

let COMMENT_FIELDS = `
  id
  body
  url
  createdAt
  updatedAt
  user {
    id
    name
    email
    displayName
  }
  issue {
    id
    identifier
    title
  }
`;

let PROJECT_FIELDS = `
  id
  name
  description
  url
  state
  progress
  startDate
  targetDate
  createdAt
  updatedAt
  archivedAt
  lead {
    id
    name
    email
  }
  teams {
    nodes {
      id
      name
      key
    }
  }
`;

let CYCLE_FIELDS = `
  id
  name
  number
  description
  startsAt
  endsAt
  completedAt
  progress
  createdAt
  updatedAt
  team {
    id
    name
    key
  }
`;

let TEAM_FIELDS = `
  id
  name
  key
  description
  color
  icon
  private
  createdAt
  updatedAt
  archivedAt
  timezone
  issueEstimationType
  issueEstimationAllowZero
  issueEstimationExtended
  cycleDuration
  cycleStartDay
  cycleCooldownTime
  cyclesEnabled
  triageEnabled
`;

let LABEL_FIELDS = `
  id
  name
  description
  color
  createdAt
  updatedAt
  isGroup
  team {
    id
    name
    key
  }
  parent {
    id
    name
  }
`;

let DOCUMENT_FIELDS = `
  id
  title
  content
  url
  icon
  color
  createdAt
  updatedAt
  creator {
    id
    name
    email
  }
  project {
    id
    name
  }
`;

let USER_FIELDS = `
  id
  name
  displayName
  email
  avatarUrl
  active
  admin
  guest
  createdAt
  updatedAt
  lastSeen
  url
`;
