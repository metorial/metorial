import {
  buildApiServiceError,
  createApiServiceError,
  createAuthenticatedAxios,
  getResponseHeaderValue
} from 'slates';

export function normalizeCanvasDomain(value: string | undefined): string {
  if (!value?.trim()) {
    throw createApiServiceError('Enter your Canvas instance domain to connect.');
  }
  let url: URL;
  try {
    url = new URL(`https://${value.trim().replace(/^https?:\/\//i, '')}`);
  } catch {
    throw createApiServiceError(
      'Enter a valid Canvas instance domain, such as school.instructure.com.'
    );
  }
  if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) {
    throw createApiServiceError(
      'Enter only the Canvas instance domain, without a path, query, or credentials.'
    );
  }
  return url.host;
}

export function createCanvasHttp(domain: string, token?: string) {
  return createAuthenticatedAxios({
    baseURL: `https://${normalizeCanvasDomain(domain)}`,
    ...(token ? { authHeader: { value: `Bearer ${token}` } } : {}),
    errorAdapter: error =>
      buildApiServiceError(error, {
        providerLabel: 'Canvas',
        reason: 'canvas_api_error',
        extractResponse: (error, helpers) => helpers.getResponseWithBody(error),
        detailKeys: ['message', 'error_description', 'error'],
        nestedKeys: ['errors', 'error_report', 'details']
      })
  });
}

export function createCanvasClient(
  auth: { token: string; canvasDomain?: string },
  legacyConfig?: object
) {
  return new CanvasClient({
    token: auth.token,
    canvasDomain:
      auth.canvasDomain ||
      (legacyConfig as { canvasDomain?: string } | undefined)?.canvasDomain
  });
}

export interface PaginatedResponse<T> {
  items: T[];
  nextPageUrl?: string;
}

export class CanvasClient {
  private http: ReturnType<typeof createCanvasHttp>;
  readonly domain: string;

  constructor(config: { token: string; canvasDomain?: string }) {
    if (!config.token?.trim()) {
      throw createApiServiceError(
        'A Canvas access token is required. Reconnect your Canvas account.'
      );
    }
    this.domain = normalizeCanvasDomain(config.canvasDomain);
    this.http = createCanvasHttp(this.domain, config.token);
    this.http.defaults.baseURL = `https://${this.domain}/api/v1`;
  }

  private parseLinkHeader(linkHeader: string | undefined): string | undefined {
    for (let match of linkHeader?.matchAll(/<([^>]+)>([^,]*)/g) ?? []) {
      let relations = match[2]?.match(/\brel\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
      if ((relations?.[1] ?? relations?.[2])?.split(/\s+/).includes('next')) {
        return match[1];
      }
    }
    return undefined;
  }

  private async fetchPaginated<T>(
    path: string,
    params?: Record<string, unknown>
  ): Promise<T[]> {
    let allItems: T[] = [];
    let url: string | undefined = path;
    let visited = new Set<string>();
    while (url) {
      let absolute: URL;
      try {
        absolute = new URL(
          url.startsWith('/api/v1/') ? url : url.startsWith('/') ? `/api/v1${url}` : url,
          `https://${this.domain}`
        );
      } catch {
        throw createApiServiceError('Canvas returned an invalid pagination link.');
      }
      if (
        absolute.origin !== `https://${this.domain}` ||
        !absolute.pathname.startsWith('/api/v1/') ||
        absolute.username ||
        absolute.password
      ) {
        throw createApiServiceError('Canvas returned an invalid pagination link.');
      }
      if (visited.has(absolute.href)) {
        throw createApiServiceError(
          'Canvas returned a repeated pagination link. Retry the request.'
        );
      }
      visited.add(absolute.href);
      let response = await this.http.get(absolute.href, {
        params: visited.size === 1 ? { per_page: 100, ...params } : undefined
      });
      if (!Array.isArray(response.data)) {
        throw createApiServiceError(
          'Canvas returned an unexpected list response. Retry the request.'
        );
      }
      allItems.push(...response.data);
      url = this.parseLinkHeader(getResponseHeaderValue(response.headers, 'link'));
    }
    return allItems;
  }

  async listCourseCreationAccounts(): Promise<any[]> {
    return this.fetchPaginated('/course_creation_accounts');
  }

  // ─── Courses ─────────────────────────────────────────────

  async listCourses(params?: {
    enrollmentType?: string;
    enrollmentState?: string;
    state?: string[];
    searchTerm?: string;
    include?: string[];
    perPage?: number;
  }): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.enrollmentType) queryParams.enrollment_type = params.enrollmentType;
    if (params?.enrollmentState) queryParams.enrollment_state = params.enrollmentState;
    if (params?.state) queryParams['state[]'] = params.state;
    if (params?.include) queryParams['include[]'] = params.include;
    if (params?.perPage) queryParams.per_page = params.perPage;
    return this.fetchPaginated('/courses', queryParams);
  }

  async getCourse(courseId: string, include?: string[]): Promise<any> {
    let params: Record<string, any> = {};
    if (include) params['include[]'] = include;
    let response = await this.http.get(`/courses/${encodeURIComponent(courseId)}`, { params });
    return response.data;
  }

  async createCourse(accountId: string, course: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/accounts/${encodeURIComponent(accountId)}/courses`, {
      course
    });
    return response.data;
  }

  async updateCourse(courseId: string, course: Record<string, any>): Promise<any> {
    let response = await this.http.put(`/courses/${encodeURIComponent(courseId)}`, { course });
    return response.data;
  }

  async deleteCourse(courseId: string, event: 'delete' | 'conclude'): Promise<any> {
    let response = await this.http.delete(`/courses/${encodeURIComponent(courseId)}`, {
      params: { event }
    });
    return response.data;
  }

  // ─── Users ───────────────────────────────────────────────

  async getSelf(): Promise<any> {
    let response = await this.http.get('/users/self/profile');
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.http.get(`/users/${encodeURIComponent(userId)}/profile`);
    return response.data;
  }

  async listCourseUsers(
    courseId: string,
    params?: {
      searchTerm?: string;
      enrollmentType?: string[];
      include?: string[];
      perPage?: number;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.searchTerm) queryParams.search_term = params.searchTerm;
    if (params?.enrollmentType) queryParams['enrollment_type[]'] = params.enrollmentType;
    if (params?.include) queryParams['include[]'] = params.include;
    if (params?.perPage) queryParams.per_page = params.perPage;
    return this.fetchPaginated(`/courses/${encodeURIComponent(courseId)}/users`, queryParams);
  }

  // ─── Enrollments ─────────────────────────────────────────

  async listEnrollments(
    courseId: string,
    params?: {
      type?: string[];
      state?: string[];
      include?: string[];
      userId?: string;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.type) queryParams['type[]'] = params.type;
    if (params?.state) queryParams['state[]'] = params.state;
    if (params?.include) queryParams['include[]'] = params.include;
    if (params?.userId) queryParams.user_id = params.userId;
    return this.fetchPaginated(
      `/courses/${encodeURIComponent(courseId)}/enrollments`,
      queryParams
    );
  }

  async enrollUser(
    courseId: string,
    enrollment: {
      userId: string;
      type: string;
      enrollmentState?: string;
      courseSectionId?: string;
      limitPrivilegesToCourseSection?: boolean;
      notify?: boolean;
      selfEnrollmentCode?: string;
      role?: string;
    }
  ): Promise<any> {
    let response = await this.http.post(
      `/courses/${encodeURIComponent(courseId)}/enrollments`,
      {
        enrollment: {
          user_id: enrollment.userId,
          type: enrollment.type,
          enrollment_state: enrollment.enrollmentState,
          course_section_id: enrollment.courseSectionId,
          limit_privileges_to_course_section: enrollment.limitPrivilegesToCourseSection,
          notify: enrollment.notify,
          self_enrollment_code: enrollment.selfEnrollmentCode,
          role: enrollment.role
        }
      }
    );
    return response.data;
  }

  async deleteEnrollment(
    courseId: string,
    enrollmentId: string,
    task: 'conclude' | 'delete' | 'inactivate' | 'deactivate'
  ): Promise<any> {
    let response = await this.http.delete(
      `/courses/${encodeURIComponent(courseId)}/enrollments/${encodeURIComponent(enrollmentId)}`,
      {
        params: { task }
      }
    );
    return response.data;
  }

  // ─── Assignments ─────────────────────────────────────────

  async listAssignments(
    courseId: string,
    params?: {
      searchTerm?: string;
      include?: string[];
      orderBy?: string;
      bucket?: string;
      perPage?: number;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.searchTerm) queryParams.search_term = params.searchTerm;
    if (params?.include) queryParams['include[]'] = params.include;
    if (params?.orderBy) queryParams.order_by = params.orderBy;
    if (params?.bucket) queryParams.bucket = params.bucket;
    if (params?.perPage) queryParams.per_page = params.perPage;
    return this.fetchPaginated(
      `/courses/${encodeURIComponent(courseId)}/assignments`,
      queryParams
    );
  }

  async getAssignment(
    courseId: string,
    assignmentId: string,
    include?: string[]
  ): Promise<any> {
    let params: Record<string, any> = {};
    if (include) params['include[]'] = include;
    let response = await this.http.get(
      `/courses/${encodeURIComponent(courseId)}/assignments/${encodeURIComponent(assignmentId)}`,
      {
        params
      }
    );
    return response.data;
  }

  async createAssignment(courseId: string, assignment: Record<string, any>): Promise<any> {
    let response = await this.http.post(
      `/courses/${encodeURIComponent(courseId)}/assignments`,
      { assignment }
    );
    return response.data;
  }

  async updateAssignment(
    courseId: string,
    assignmentId: string,
    assignment: Record<string, any>
  ): Promise<any> {
    let response = await this.http.put(
      `/courses/${encodeURIComponent(courseId)}/assignments/${encodeURIComponent(assignmentId)}`,
      {
        assignment
      }
    );
    return response.data;
  }

  async deleteAssignment(courseId: string, assignmentId: string): Promise<any> {
    let response = await this.http.delete(
      `/courses/${encodeURIComponent(courseId)}/assignments/${encodeURIComponent(assignmentId)}`
    );
    return response.data;
  }

  // ─── Submissions ─────────────────────────────────────────

  async listSubmissions(
    courseId: string,
    assignmentId: string,
    params?: {
      include?: string[];
      perPage?: number;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.include) queryParams['include[]'] = params.include;
    if (params?.perPage) queryParams.per_page = params.perPage;
    return this.fetchPaginated(
      `/courses/${encodeURIComponent(courseId)}/assignments/${encodeURIComponent(assignmentId)}/submissions`,
      queryParams
    );
  }

  async getSubmission(
    courseId: string,
    assignmentId: string,
    userId: string,
    include?: string[]
  ): Promise<any> {
    let params: Record<string, any> = {};
    if (include) params['include[]'] = include;
    let response = await this.http.get(
      `/courses/${encodeURIComponent(courseId)}/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(userId)}`,
      { params }
    );
    return response.data;
  }

  async gradeSubmission(
    courseId: string,
    assignmentId: string,
    userId: string,
    data: {
      postedGrade?: string;
      excuse?: boolean;
      comment?: string;
    }
  ): Promise<any> {
    let body: Record<string, any> = {};
    if (data.postedGrade !== undefined) body.submission = { posted_grade: data.postedGrade };
    if (data.excuse !== undefined)
      body.submission = { ...body.submission, excuse: data.excuse };
    if (data.comment !== undefined) body.comment = { text_comment: data.comment };
    let response = await this.http.put(
      `/courses/${encodeURIComponent(courseId)}/assignments/${encodeURIComponent(assignmentId)}/submissions/${encodeURIComponent(userId)}`,
      body
    );
    return response.data;
  }

  // ─── Modules ─────────────────────────────────────────────

  async listModules(
    courseId: string,
    params?: {
      searchTerm?: string;
      include?: string[];
      studentId?: string;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.searchTerm) queryParams.search_term = params.searchTerm;
    if (params?.include) queryParams['include[]'] = params.include;
    if (params?.studentId) queryParams.student_id = params.studentId;
    return this.fetchPaginated(
      `/courses/${encodeURIComponent(courseId)}/modules`,
      queryParams
    );
  }

  async getModule(courseId: string, moduleId: string, include?: string[]): Promise<any> {
    let params: Record<string, any> = {};
    if (include) params['include[]'] = include;
    let response = await this.http.get(
      `/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}`,
      { params }
    );
    return response.data;
  }

  async createModule(courseId: string, module: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/courses/${encodeURIComponent(courseId)}/modules`, {
      module
    });
    return response.data;
  }

  async updateModule(
    courseId: string,
    moduleId: string,
    module: Record<string, any>
  ): Promise<any> {
    let response = await this.http.put(
      `/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}`,
      { module }
    );
    return response.data;
  }

  async deleteModule(courseId: string, moduleId: string): Promise<any> {
    let response = await this.http.delete(
      `/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}`
    );
    return response.data;
  }

  async listModuleItems(
    courseId: string,
    moduleId: string,
    include?: string[]
  ): Promise<any[]> {
    let params: Record<string, any> = {};
    if (include) params['include[]'] = include;
    return this.fetchPaginated(
      `/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/items`,
      params
    );
  }

  async createModuleItem(
    courseId: string,
    moduleId: string,
    moduleItem: Record<string, any>
  ): Promise<any> {
    let response = await this.http.post(
      `/courses/${encodeURIComponent(courseId)}/modules/${encodeURIComponent(moduleId)}/items`,
      {
        module_item: moduleItem
      }
    );
    return response.data;
  }

  // ─── Discussion Topics ───────────────────────────────────

  async listDiscussionTopics(
    courseId: string,
    params?: {
      orderBy?: string;
      searchTerm?: string;
      filterBy?: string;
      onlyAnnouncements?: boolean;
      include?: string[];
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.orderBy) queryParams.order_by = params.orderBy;
    if (params?.searchTerm) queryParams.search_term = params.searchTerm;
    if (params?.filterBy) queryParams.filter_by = params.filterBy;
    if (params?.onlyAnnouncements !== undefined)
      queryParams.only_announcements = params.onlyAnnouncements;
    if (params?.include) queryParams['include[]'] = params.include;
    return this.fetchPaginated(
      `/courses/${encodeURIComponent(courseId)}/discussion_topics`,
      queryParams
    );
  }

  async getDiscussionTopic(
    courseId: string,
    topicId: string,
    include?: string[]
  ): Promise<any> {
    let params: Record<string, any> = {};
    if (include) params['include[]'] = include;
    let response = await this.http.get(
      `/courses/${encodeURIComponent(courseId)}/discussion_topics/${encodeURIComponent(topicId)}`,
      {
        params
      }
    );
    return response.data;
  }

  async createDiscussionTopic(courseId: string, topic: Record<string, any>): Promise<any> {
    let response = await this.http.post(
      `/courses/${encodeURIComponent(courseId)}/discussion_topics`,
      topic
    );
    return response.data;
  }

  async updateDiscussionTopic(
    courseId: string,
    topicId: string,
    topic: Record<string, any>
  ): Promise<any> {
    let response = await this.http.put(
      `/courses/${encodeURIComponent(courseId)}/discussion_topics/${encodeURIComponent(topicId)}`,
      topic
    );
    return response.data;
  }

  async deleteDiscussionTopic(courseId: string, topicId: string): Promise<any> {
    let response = await this.http.delete(
      `/courses/${encodeURIComponent(courseId)}/discussion_topics/${encodeURIComponent(topicId)}`
    );
    return response.data;
  }

  // ─── Pages (Wiki) ────────────────────────────────────────

  async listPages(
    courseId: string,
    params?: {
      sort?: string;
      order?: string;
      searchTerm?: string;
      published?: boolean;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.order) queryParams.order = params.order;
    if (params?.searchTerm) queryParams.search_term = params.searchTerm;
    if (params?.published !== undefined) queryParams.published = params.published;
    return this.fetchPaginated(`/courses/${encodeURIComponent(courseId)}/pages`, queryParams);
  }

  async getPage(courseId: string, pageUrl: string): Promise<any> {
    let response = await this.http.get(
      `/courses/${encodeURIComponent(courseId)}/pages/${encodeURIComponent(pageUrl)}`
    );
    return response.data;
  }

  async createPage(courseId: string, wikiPage: Record<string, any>): Promise<any> {
    let response = await this.http.post(`/courses/${encodeURIComponent(courseId)}/pages`, {
      wiki_page: wikiPage
    });
    return response.data;
  }

  async updatePage(
    courseId: string,
    pageUrl: string,
    wikiPage: Record<string, any>
  ): Promise<any> {
    let response = await this.http.put(
      `/courses/${encodeURIComponent(courseId)}/pages/${encodeURIComponent(pageUrl)}`,
      {
        wiki_page: wikiPage
      }
    );
    return response.data;
  }

  async deletePage(courseId: string, pageUrl: string): Promise<any> {
    let response = await this.http.delete(
      `/courses/${encodeURIComponent(courseId)}/pages/${encodeURIComponent(pageUrl)}`
    );
    return response.data;
  }

  // ─── Files ───────────────────────────────────────────────

  async listFiles(
    courseId: string,
    params?: {
      searchTerm?: string;
      contentTypes?: string[];
      sort?: string;
      order?: string;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.searchTerm) queryParams.search_term = params.searchTerm;
    if (params?.contentTypes) queryParams['content_types[]'] = params.contentTypes;
    if (params?.sort) queryParams.sort = params.sort;
    if (params?.order) queryParams.order = params.order;
    return this.fetchPaginated(`/courses/${encodeURIComponent(courseId)}/files`, queryParams);
  }

  async getFile(fileId: string, include?: string[]): Promise<any> {
    let params: Record<string, any> = {};
    if (include) params['include[]'] = include;
    let response = await this.http.get(`/files/${encodeURIComponent(fileId)}`, { params });
    return response.data;
  }

  // ─── Calendar Events ─────────────────────────────────────

  async listCalendarEvents(params?: {
    type?: string;
    startDate?: string;
    endDate?: string;
    contextCodes?: string[];
    allEvents?: boolean;
  }): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.type) queryParams.type = params.type;
    if (params?.startDate) queryParams.start_date = params.startDate;
    if (params?.endDate) queryParams.end_date = params.endDate;
    if (params?.contextCodes) queryParams['context_codes[]'] = params.contextCodes;
    if (params?.allEvents !== undefined) queryParams.all_events = params.allEvents;
    return this.fetchPaginated('/calendar_events', queryParams);
  }

  async createCalendarEvent(calendarEvent: Record<string, any>): Promise<any> {
    let response = await this.http.post('/calendar_events', { calendar_event: calendarEvent });
    return response.data;
  }

  async updateCalendarEvent(
    eventId: string,
    calendarEvent: Record<string, any>
  ): Promise<any> {
    let response = await this.http.put(`/calendar_events/${encodeURIComponent(eventId)}`, {
      calendar_event: calendarEvent
    });
    return response.data;
  }

  async deleteCalendarEvent(eventId: string, cancelReason?: string): Promise<any> {
    let params: Record<string, any> = {};
    if (cancelReason) params.cancel_reason = cancelReason;
    let response = await this.http.delete(`/calendar_events/${encodeURIComponent(eventId)}`, {
      params
    });
    return response.data;
  }

  // ─── Conversations ───────────────────────────────────────

  async listConversations(params?: {
    scope?: string;
    filter?: string[];
    include?: string[];
  }): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.scope) queryParams.scope = params.scope;
    if (params?.filter) queryParams['filter[]'] = params.filter;
    if (params?.include) queryParams['include[]'] = params.include;
    return this.fetchPaginated('/conversations', queryParams);
  }

  async getConversation(conversationId: string): Promise<any> {
    let response = await this.http.get(
      `/conversations/${encodeURIComponent(conversationId)}`,
      {
        params: { auto_mark_as_read: false }
      }
    );
    return response.data;
  }

  async createConversation(conversation: {
    recipients: string[];
    body: string;
    subject?: string;
    groupConversation?: boolean;
    contextCode?: string;
    mediaCommentId?: string;
    mediaCommentType?: string;
    bulkMessage?: boolean;
    attachmentIds?: string[];
  }): Promise<any> {
    let response = await this.http.post('/conversations', {
      recipients: conversation.recipients,
      body: conversation.body,
      subject: conversation.subject,
      group_conversation: conversation.groupConversation,
      context_code: conversation.contextCode,
      media_comment_id: conversation.mediaCommentId,
      media_comment_type: conversation.mediaCommentType,
      bulk_message: conversation.bulkMessage,
      attachment_ids: conversation.attachmentIds
    });
    return response.data;
  }

  // ─── Quizzes ─────────────────────────────────────────────

  async listQuizzes(
    courseId: string,
    params?: {
      searchTerm?: string;
      perPage?: number;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.searchTerm) queryParams.search_term = params.searchTerm;
    if (params?.perPage) queryParams.per_page = params.perPage;
    return this.fetchPaginated(
      `/courses/${encodeURIComponent(courseId)}/quizzes`,
      queryParams
    );
  }

  async getQuiz(courseId: string, quizId: string): Promise<any> {
    let response = await this.http.get(
      `/courses/${encodeURIComponent(courseId)}/quizzes/${encodeURIComponent(quizId)}`
    );
    return response.data;
  }

  // ─── Groups ──────────────────────────────────────────────

  async listGroups(
    contextType: 'course' | 'account',
    contextId: string,
    params?: {
      include?: string[];
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {};
    if (params?.include) queryParams['include[]'] = params.include;
    let path =
      contextType === 'course'
        ? `/courses/${encodeURIComponent(contextId)}/groups`
        : `/accounts/${encodeURIComponent(contextId)}/groups`;
    return this.fetchPaginated(path, queryParams);
  }

  async getGroup(groupId: string, include?: string[]): Promise<any> {
    let params: Record<string, any> = {};
    if (include) params['include[]'] = include;
    let response = await this.http.get(`/groups/${encodeURIComponent(groupId)}`, { params });
    return response.data;
  }

  // ─── Rubrics ─────────────────────────────────────────────

  async listRubrics(courseId: string): Promise<any[]> {
    return this.fetchPaginated(`/courses/${encodeURIComponent(courseId)}/rubrics`);
  }

  async getRubric(
    courseId: string,
    rubricId: string,
    params?: {
      include?: string[];
      style?: string;
    }
  ): Promise<any> {
    let queryParams: Record<string, any> = {};
    if (params?.include) queryParams['include[]'] = params.include;
    if (params?.style) queryParams.style = params.style;
    let response = await this.http.get(
      `/courses/${encodeURIComponent(courseId)}/rubrics/${encodeURIComponent(rubricId)}`,
      {
        params: queryParams
      }
    );
    return response.data;
  }

  // ─── Assignment Groups ───────────────────────────────────

  async listAssignmentGroups(courseId: string, include?: string[]): Promise<any[]> {
    let params: Record<string, any> = {};
    if (include) params['include[]'] = include;
    return this.fetchPaginated(
      `/courses/${encodeURIComponent(courseId)}/assignment_groups`,
      params
    );
  }

  // ─── Grading ─────────────────────────────────────────────

  async getCourseTotalGrades(courseId: string): Promise<any[]> {
    return this.listEnrollments(courseId, {
      include: ['current_points']
    });
  }

  // ─── Announcements ──────────────────────────────────────

  async listAnnouncements(
    contextCodes: string[],
    params?: {
      startDate?: string;
      endDate?: string;
      activeOnly?: boolean;
      latestOnly?: boolean;
    }
  ): Promise<any[]> {
    let queryParams: Record<string, any> = {
      'context_codes[]': contextCodes
    };
    if (params?.startDate) queryParams.start_date = params.startDate;
    if (params?.endDate) queryParams.end_date = params.endDate;
    if (params?.activeOnly !== undefined) queryParams.active_only = params.activeOnly;
    if (params?.latestOnly !== undefined) queryParams.latest_only = params.latestOnly;
    return this.fetchPaginated('/announcements', queryParams);
  }

  // ─── Activity Stream ─────────────────────────────────────

  async getActivityStream(): Promise<any[]> {
    return this.fetchPaginated('/users/self/activity_stream');
  }

  // ─── Course Analytics ────────────────────────────────────

  async getCourseAnalytics(
    courseId: string,
    type: 'activity' | 'assignments' | 'student_summaries'
  ): Promise<any> {
    if (type === 'student_summaries') {
      return this.fetchPaginated(`/courses/${encodeURIComponent(courseId)}/analytics/${type}`);
    }
    let response = await this.http.get(
      `/courses/${encodeURIComponent(courseId)}/analytics/${type}`
    );
    return response.data;
  }
}
