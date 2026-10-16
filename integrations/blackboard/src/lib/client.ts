import { createApiServiceError, createAuthenticatedAxios, isApiErrorRecord } from 'slates';
import { normalizeBaseUrl } from './base-url';
import { blackboardApiError } from './errors';

export interface PaginatedResponse<T> {
  results: T[];
  paging?: {
    nextPage?: string;
  };
}

export interface BlackboardCourse {
  id: string;
  uuid?: string;
  externalId?: string;
  courseId: string;
  name: string;
  description?: string;
  organization: boolean;
  ultraStatus?: string;
  closedComplete?: boolean;
  termId?: string;
  availability?: {
    available: string;
    duration?: {
      type: string;
      start?: string;
      end?: string;
    };
  };
  enrollment?: {
    type: string;
    start?: string;
    end?: string;
    accessCode?: string;
  };
  locale?: {
    id?: string;
    force?: boolean;
  };
  created?: string;
  modified?: string;
  allowGuests?: boolean;
  readOnly?: boolean;
}

export interface BlackboardUser {
  id: string;
  uuid?: string;
  externalId?: string;
  userName: string;
  educationLevel?: string;
  gender?: string;
  created?: string;
  modified?: string;
  lastLogin?: string;
  institutionRoleIds?: string[];
  systemRoleIds?: string[];
  availability?: {
    available: string;
  };
  name?: {
    given?: string;
    family?: string;
    middle?: string;
    other?: string;
    suffix?: string;
    title?: string;
  };
  contact?: {
    email?: string;
    institutionEmail?: string;
    homePhone?: string;
    mobilePhone?: string;
    businessPhone?: string;
    businessFax?: string;
    webPage?: string;
  };
  address?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export interface BlackboardMembership {
  userId: string;
  courseId: string;
  childCourseId?: string;
  dataSourceId?: string;
  created?: string;
  modified?: string;
  availability?: {
    available: string;
  };
  courseRoleId?: string;
  lastAccessed?: string;
}

export interface BlackboardContent {
  id: string;
  parentId?: string;
  title: string;
  body?: string;
  description?: string;
  position?: number;
  created?: string;
  modified?: string;
  contentHandler?: {
    id: string;
    url?: string;
  };
  availability?: {
    available: string;
    allowGuests?: boolean;
    adaptiveRelease?: {
      start?: string;
      end?: string;
    };
  };
}

export interface BlackboardGradeColumn {
  id: string;
  externalId?: string;
  name: string;
  displayName?: string;
  description?: string;
  externalGrade?: boolean;
  created?: string;
  modified?: string;
  contentId?: string;
  score?: {
    possible: number;
  };
  availability?: {
    available: string;
  };
  grading?: {
    type: string;
    due?: string;
    attemptsAllowed?: number;
    scoringModel?: string;
    schemaId?: string;
    anonymousGrading?: {
      type: string;
      releaseAfter?: string;
    };
  };
}

export interface BlackboardGrade {
  userId: string;
  columnId: string;
  status?: string;
  displayGrade?: {
    scaleType?: string;
    score?: number;
    text?: string;
  };
  text?: string;
  score?: number;
  overridden?: string;
  notes?: string;
  feedback?: string;
  exempt?: boolean;
  corrupt?: boolean;
  gradeNotationId?: string;
  changeIndex?: number;
  created?: string;
  modified?: string;
}

export interface BlackboardAnnouncement {
  creatorUserId?: string;
  id: string;
  title: string;
  body: string;
  availability?: {
    duration?: {
      type: string;
      start?: string;
      end?: string;
    };
  };
  showAtLogin?: boolean;
  showInCourses?: boolean;
  created?: string;
  modified?: string;
  creator?: string;
}

export interface BlackboardAttempt {
  id: string;
  userId: string;
  status?: string;
  text?: string;
  score?: number;
  notes?: string;
  feedback?: string;
  studentComments?: string;
  studentSubmission?: string;
  exempt?: boolean;
  created?: string;
  modified?: string;
}

export interface BlackboardGroup {
  id: string;
  externalId?: string;
  groupSetId?: string;
  name: string;
  description?: string;
  availability?: {
    available: string;
  };
  enrollment?: {
    type: string;
    limit?: number;
    signupSheet?: {
      name?: string;
      description?: string;
      showMembers?: boolean;
    };
  };
  created?: string;
  modified?: string;
}

export interface BlackboardTerm {
  id: string;
  externalId?: string;
  dataSourceId?: string;
  name: string;
  description?: string;
  availability?: {
    available: string;
    duration?: {
      type: string;
      start?: string;
      end?: string;
    };
  };
}

export interface BlackboardAttendanceMeeting {
  id: string | number;
  description?: string;
  courseId?: string;
  start?: string;
  end?: string;
  title?: string;
  created?: string;
  modified?: string;
}

export interface BlackboardAttendanceRecord {
  modifiedTime?: string;
  userId: string;
  meetingId?: string;
  status: string;
  modified?: string;
}

export class Client {
  private http: ReturnType<typeof createAuthenticatedAxios>;

  constructor(params: { baseUrl: string; token: string }) {
    this.http = createAuthenticatedAxios({
      baseURL: normalizeBaseUrl(params.baseUrl),
      authHeader: { value: `Bearer ${params.token}` },
      errorAdapter: blackboardApiError
    });
  }

  // ── Courses ──────────────────────────────────────────

  async listCourses(options?: {
    offset?: number;
    limit?: number;
    sort?: string;
    availability?: string;
    dataSourceId?: string;
    termId?: string;
    modified?: string;
    modifiedCompare?: string;
  }): Promise<PaginatedResponse<BlackboardCourse>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    if (options?.sort) params.sort = options.sort;
    if (options?.availability) params['availability.available'] = options.availability;
    if (options?.dataSourceId) params.dataSourceId = options.dataSourceId;
    if (options?.termId) params.termId = options.termId;
    if (options?.modified) params.modified = options.modified;
    if (options?.modifiedCompare) params.modifiedCompare = options.modifiedCompare;
    let response = await this.http.get('/learn/api/public/v3/courses', { params });
    return response.data;
  }

  async getCourse(courseId: string): Promise<BlackboardCourse> {
    let response = await this.http.get(
      `/learn/api/public/v3/courses/${encodeURIComponent(courseId)}`
    );
    return response.data;
  }

  async createCourse(data: {
    courseId: string;
    name: string;
    description?: string;
    organization?: boolean;
    termId?: string;
    availability?: {
      available?: string;
      duration?: { type?: string; start?: string; end?: string; daysOfUse?: number };
    };
    enrollment?: {
      type?: string;
      accessCode?: string;
    };
    allowGuests?: boolean;
  }): Promise<BlackboardCourse> {
    validateWholeNumber(data.availability?.duration?.daysOfUse, 'daysOfUse', 1);
    if (
      data.availability?.duration?.type === 'FixedNumDays' &&
      data.availability.duration.daysOfUse === undefined
    )
      throw createApiServiceError('FixedNumDays requires availability.duration.daysOfUse.');
    let response = await this.http.post('/learn/api/public/v3/courses', data);
    return response.data;
  }

  async updateCourse(
    courseId: string,
    data: {
      name?: string;
      description?: string;
      termId?: string;
      availability?: {
        available?: string;
        duration?: { type?: string; start?: string; end?: string; daysOfUse?: number };
      };
      enrollment?: {
        type?: string;
        accessCode?: string;
      };
      allowGuests?: boolean;
    }
  ): Promise<BlackboardCourse> {
    validateWholeNumber(data.availability?.duration?.daysOfUse, 'daysOfUse', 1);
    let response = await this.http.patch(
      `/learn/api/public/v3/courses/${encodeURIComponent(courseId)}`,
      data
    );
    return response.data;
  }

  async deleteCourse(courseId: string): Promise<void> {
    await this.http.delete(`/learn/api/public/v3/courses/${encodeURIComponent(courseId)}`);
  }

  // ── Users ────────────────────────────────────────────

  async listUsers(options?: {
    offset?: number;
    limit?: number;
    sort?: string;
    availability?: string;
    dataSourceId?: string;
    modified?: string;
    modifiedCompare?: string;
  }): Promise<PaginatedResponse<BlackboardUser>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    if (options?.sort) params.sort = options.sort;
    if (options?.availability) params['availability.available'] = options.availability;
    if (options?.dataSourceId) params.dataSourceId = options.dataSourceId;
    if (options?.modified) params.modified = options.modified;
    if (options?.modifiedCompare) params.modifiedCompare = options.modifiedCompare;
    let response = await this.http.get('/learn/api/public/v1/users', { params });
    return response.data;
  }

  async getUser(userId: string): Promise<BlackboardUser> {
    let response = await this.http.get(
      `/learn/api/public/v1/users/${encodeURIComponent(userId)}`
    );
    return response.data;
  }

  async createUser(data: {
    userName: string;
    password?: string;
    externalId?: string;
    dataSourceId?: string;
    availability?: { available?: string };
    name?: {
      given?: string;
      family?: string;
      middle?: string;
      other?: string;
      suffix?: string;
      title?: string;
    };
    contact?: { email?: string; institutionEmail?: string };
    institutionRoleIds?: string[];
    systemRoleIds?: string[];
  }): Promise<BlackboardUser> {
    let missingFields = [
      ...(data.password === undefined ? ['password'] : []),
      ...(data.name?.given === undefined ? ['name.given'] : []),
      ...(data.name?.family === undefined ? ['name.family'] : [])
    ];
    if (missingFields.length) {
      throw createApiServiceError(
        `Creating a Blackboard Learn user requires ${missingFields.join(', ')}.`
      );
    }
    let response = await this.http.post('/learn/api/public/v1/users', data);
    return response.data;
  }

  async updateUser(
    userId: string,
    data: {
      userName?: string;
      password?: string;
      externalId?: string;
      dataSourceId?: string;
      availability?: { available?: string };
      name?: {
        given?: string;
        family?: string;
        middle?: string;
        other?: string;
        suffix?: string;
        title?: string;
      };
      contact?: { email?: string; institutionEmail?: string };
      institutionRoleIds?: string[];
      systemRoleIds?: string[];
    }
  ): Promise<BlackboardUser> {
    let response = await this.http.patch(
      `/learn/api/public/v1/users/${encodeURIComponent(userId)}`,
      data
    );
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.http.delete(`/learn/api/public/v1/users/${encodeURIComponent(userId)}`);
  }

  // ── Memberships ──────────────────────────────────────

  async listCourseMemberships(
    courseId: string,
    options?: {
      offset?: number;
      limit?: number;
      role?: string;
      availability?: string;
      modified?: string;
      modifiedCompare?: string;
    }
  ): Promise<PaginatedResponse<BlackboardMembership>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    if (options?.role) params.role = options.role;
    if (options?.availability) params['availability.available'] = options.availability;
    if (options?.modified) params.modified = options.modified;
    if (options?.modifiedCompare) params.modifiedCompare = options.modifiedCompare;
    let response = await this.http.get(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/users`,
      { params }
    );
    return response.data;
  }

  async getCourseMembership(courseId: string, userId: string): Promise<BlackboardMembership> {
    let response = await this.http.get(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/users/${encodeURIComponent(userId)}`
    );
    return response.data;
  }

  async createCourseMembership(
    courseId: string,
    userId: string,
    data: {
      dataSourceId?: string;
      availability?: { available?: string };
      courseRoleId?: string;
    }
  ): Promise<BlackboardMembership> {
    let response = await this.http.put(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/users/${encodeURIComponent(userId)}`,
      data
    );
    return response.data;
  }

  async updateCourseMembership(
    courseId: string,
    userId: string,
    data: {
      dataSourceId?: string;
      availability?: { available?: string };
      courseRoleId?: string;
    }
  ): Promise<BlackboardMembership> {
    let response = await this.http.patch(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/users/${encodeURIComponent(userId)}`,
      data
    );
    return response.data;
  }

  async deleteCourseMembership(courseId: string, userId: string): Promise<void> {
    await this.http.delete(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/users/${encodeURIComponent(userId)}`
    );
  }

  async listUserMemberships(
    userId: string,
    options?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<BlackboardMembership>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get(
      `/learn/api/public/v1/users/${encodeURIComponent(userId)}/courses`,
      { params }
    );
    return response.data;
  }

  // ── Content ──────────────────────────────────────────

  async listCourseContent(
    courseId: string,
    options?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<BlackboardContent>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/contents`,
      { params }
    );
    return response.data;
  }

  async listContentChildren(
    courseId: string,
    contentId: string,
    options?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<BlackboardContent>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/contents/${encodeURIComponent(contentId)}/children`,
      { params }
    );
    return response.data;
  }

  async getContent(courseId: string, contentId: string): Promise<BlackboardContent> {
    let response = await this.http.get(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/contents/${encodeURIComponent(contentId)}`
    );
    return response.data;
  }

  async createContent(
    courseId: string,
    data: {
      parentId?: string;
      title: string;
      body?: string;
      description?: string;
      position?: number;
      contentHandler?: { id: string; url?: string };
      availability?: {
        available?: string;
        allowGuests?: boolean;
        adaptiveRelease?: { start?: string; end?: string };
      };
    }
  ): Promise<BlackboardContent> {
    validateWholeNumber(data.position, 'position');
    let parentPath = data.parentId
      ? `/contents/${encodeURIComponent(data.parentId)}/children`
      : '/contents';
    let response = await this.http.post(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}${parentPath}`,
      data
    );
    return response.data;
  }

  async updateContent(
    courseId: string,
    contentId: string,
    data: {
      title?: string;
      body?: string;
      description?: string;
      position?: number;
      availability?: {
        available?: string;
        allowGuests?: boolean;
        adaptiveRelease?: { start?: string; end?: string };
      };
    }
  ): Promise<BlackboardContent> {
    validateWholeNumber(data.position, 'position');
    let response = await this.http.patch(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/contents/${encodeURIComponent(contentId)}`,
      data
    );
    return response.data;
  }

  async deleteContent(courseId: string, contentId: string): Promise<void> {
    await this.http.delete(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/contents/${encodeURIComponent(contentId)}`
    );
  }

  // ── Grade Columns ────────────────────────────────────

  async listGradeColumns(
    courseId: string,
    options?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<BlackboardGradeColumn>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/gradebook/columns`,
      { params }
    );
    return response.data;
  }

  async getGradeColumn(courseId: string, columnId: string): Promise<BlackboardGradeColumn> {
    let response = await this.http.get(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/gradebook/columns/${encodeURIComponent(columnId)}`
    );
    return response.data;
  }

  async createGradeColumn(
    courseId: string,
    data: {
      name: string;
      displayName?: string;
      description?: string;
      externalId?: string;
      externalGrade?: boolean;
      score?: { possible: number };
      availability?: { available?: string };
      grading?: {
        type?: string;
        due?: string;
        attemptsAllowed?: number;
        scoringModel?: string;
        schemaId?: string;
        anonymousGrading?: { type: string; releaseAfter?: string };
      };
    }
  ): Promise<BlackboardGradeColumn> {
    validateWholeNumber(data.grading?.attemptsAllowed, 'attemptsAllowed');
    let response = await this.http.post(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/gradebook/columns`,
      data
    );
    return response.data;
  }

  async updateGradeColumn(
    courseId: string,
    columnId: string,
    data: {
      name?: string;
      displayName?: string;
      description?: string;
      externalId?: string;
      externalGrade?: boolean;
      score?: { possible: number };
      availability?: { available?: string };
      grading?: {
        type?: string;
        due?: string;
        attemptsAllowed?: number;
        scoringModel?: string;
        schemaId?: string;
      };
    }
  ): Promise<BlackboardGradeColumn> {
    validateWholeNumber(data.grading?.attemptsAllowed, 'attemptsAllowed');
    let response = await this.http.patch(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/gradebook/columns/${encodeURIComponent(columnId)}`,
      data
    );
    return response.data;
  }

  async deleteGradeColumn(courseId: string, columnId: string): Promise<void> {
    await this.http.delete(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/gradebook/columns/${encodeURIComponent(columnId)}`
    );
  }

  // ── Grades ───────────────────────────────────────────

  async listColumnGrades(
    courseId: string,
    columnId: string,
    options?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<BlackboardGrade>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/gradebook/columns/${encodeURIComponent(columnId)}/users`,
      { params }
    );
    return response.data;
  }

  async getGrade(
    courseId: string,
    columnId: string,
    userId: string
  ): Promise<BlackboardGrade> {
    let response = await this.http.get(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/gradebook/columns/${encodeURIComponent(columnId)}/users/${encodeURIComponent(userId)}`
    );
    return response.data;
  }

  async updateGrade(
    courseId: string,
    columnId: string,
    userId: string,
    data: {
      text?: string;
      score?: number;
      notes?: string;
      feedback?: string;
      exempt?: boolean;
    }
  ): Promise<BlackboardGrade> {
    let response = await this.http.patch(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/gradebook/columns/${encodeURIComponent(columnId)}/users/${encodeURIComponent(userId)}`,
      data
    );
    return response.data;
  }

  async listUserGrades(
    courseId: string,
    userId: string,
    options?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<BlackboardGrade>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/gradebook/users/${encodeURIComponent(userId)}`,
      { params }
    );
    return response.data;
  }

  // ── Announcements ────────────────────────────────────

  async listCourseAnnouncements(
    courseId: string,
    options?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<BlackboardAnnouncement>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/announcements`,
      { params }
    );
    return response.data;
  }

  async getCourseAnnouncement(
    courseId: string,
    announcementId: string
  ): Promise<BlackboardAnnouncement> {
    let response = await this.http.get(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/announcements/${encodeURIComponent(announcementId)}`
    );
    return response.data;
  }

  private async prepareCourseAnnouncement<
    T extends {
      showAtLogin?: boolean;
      showInCourses?: boolean;
      availability?: { duration?: { type?: string; start?: string; end?: string } };
    }
  >(courseId: string, data: T) {
    if (data.showAtLogin || data.showInCourses)
      throw createApiServiceError(
        'showAtLogin and showInCourses are only supported for system announcements, not course announcements.'
      );
    let { showAtLogin: _login, showInCourses: _courses, ...body } = data;
    let duration = body.availability?.duration;
    if (duration?.type === 'DateRange') duration.type = 'Restricted';
    if (duration?.type === 'Term') {
      let course = await this.getCourse(courseId);
      if (!course.termId)
        throw createApiServiceError(
          'The course has no term. Use DateRange with startDate and endDate.'
        );
      let term = await this.getTerm(course.termId);
      let dates = term.availability?.duration;
      if (!dates?.start || !dates.end)
        throw createApiServiceError(
          'The course term has no date range. Use DateRange with startDate and endDate.'
        );
      body.availability = {
        duration: { type: 'Restricted', start: dates.start, end: dates.end }
      };
    }
    if (duration?.type === undefined && (duration?.start || duration?.end))
      duration.type = 'Restricted';
    return body;
  }

  async createCourseAnnouncement(
    courseId: string,
    data: {
      title: string;
      body: string;
      availability?: {
        duration?: { type?: string; start?: string; end?: string };
      };
      showAtLogin?: boolean;
      showInCourses?: boolean;
    }
  ): Promise<BlackboardAnnouncement> {
    let body = await this.prepareCourseAnnouncement(courseId, data);
    let response = await this.http.post(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/announcements`,
      body
    );
    return response.data;
  }

  async updateCourseAnnouncement(
    courseId: string,
    announcementId: string,
    data: {
      title?: string;
      body?: string;
      availability?: {
        duration?: { type?: string; start?: string; end?: string };
      };
      showAtLogin?: boolean;
      showInCourses?: boolean;
    }
  ): Promise<BlackboardAnnouncement> {
    let body = await this.prepareCourseAnnouncement(courseId, data);
    let response = await this.http.patch(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/announcements/${encodeURIComponent(announcementId)}`,
      body
    );
    return response.data;
  }

  async deleteCourseAnnouncement(courseId: string, announcementId: string): Promise<void> {
    await this.http.delete(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/announcements/${encodeURIComponent(announcementId)}`
    );
  }

  async listSystemAnnouncements(options?: {
    offset?: number;
    limit?: number;
  }): Promise<PaginatedResponse<BlackboardAnnouncement>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get('/learn/api/public/v1/announcements', { params });
    return response.data;
  }

  // ── Attempts (Assignment Submissions) ────────────────

  async listColumnAttempts(
    courseId: string,
    columnId: string,
    options?: {
      offset?: number;
      limit?: number;
      userId?: string;
    }
  ): Promise<PaginatedResponse<BlackboardAttempt>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    if (options?.userId) params.userId = options.userId;
    let response = await this.http.get(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/gradebook/columns/${encodeURIComponent(columnId)}/attempts`,
      { params }
    );
    return response.data;
  }

  async getAttempt(
    courseId: string,
    columnId: string,
    attemptId: string
  ): Promise<BlackboardAttempt> {
    let response = await this.http.get(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/gradebook/columns/${encodeURIComponent(columnId)}/attempts/${encodeURIComponent(attemptId)}`
    );
    return response.data;
  }

  async updateAttempt(
    courseId: string,
    columnId: string,
    attemptId: string,
    data: {
      status?: string;
      score?: number;
      text?: string;
      notes?: string;
      feedback?: string;
      exempt?: boolean;
      studentComments?: string;
      studentSubmission?: string;
    }
  ): Promise<BlackboardAttempt> {
    let response = await this.http.patch(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/gradebook/columns/${encodeURIComponent(columnId)}/attempts/${encodeURIComponent(attemptId)}`,
      data
    );
    return response.data;
  }

  // ── Groups ───────────────────────────────────────────

  async listCourseGroups(
    courseId: string,
    options?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<BlackboardGroup>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/groups`,
      { params }
    );
    return response.data;
  }

  async getCourseGroup(courseId: string, groupId: string): Promise<BlackboardGroup> {
    let response = await this.http.get(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/groups/${encodeURIComponent(groupId)}`
    );
    return response.data;
  }

  async createCourseGroup(
    courseId: string,
    data: {
      name: string;
      externalId?: string;
      description?: string;
      availability?: { available?: string };
      enrollment?: {
        type?: string;
        limit?: number;
        signupSheet?: { name?: string; description?: string; showMembers?: boolean };
      };
    }
  ): Promise<BlackboardGroup> {
    validateWholeNumber(data.enrollment?.limit, 'memberLimit');
    let response = await this.http.post(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/groups`,
      data
    );
    return response.data;
  }

  async updateCourseGroup(
    courseId: string,
    groupId: string,
    data: {
      name?: string;
      externalId?: string;
      description?: string;
      availability?: { available?: string };
      enrollment?: {
        type?: string;
        limit?: number;
        signupSheet?: { name?: string; description?: string; showMembers?: boolean };
      };
    }
  ): Promise<BlackboardGroup> {
    validateWholeNumber(data.enrollment?.limit, 'memberLimit');
    let response = await this.http.patch(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/groups/${encodeURIComponent(groupId)}`,
      data
    );
    return response.data;
  }

  async deleteCourseGroup(courseId: string, groupId: string): Promise<void> {
    await this.http.delete(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/groups/${encodeURIComponent(groupId)}`
    );
  }

  async listGroupMembers(
    courseId: string,
    groupId: string,
    options?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<{ userId: string }>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/groups/${encodeURIComponent(groupId)}/users`,
      { params }
    );
    return response.data;
  }

  async addGroupMember(
    courseId: string,
    groupId: string,
    userId: string
  ): Promise<{ userId: string }> {
    let response = await this.http.put(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/groups/${encodeURIComponent(groupId)}/users/${encodeURIComponent(userId)}`,
      {}
    );
    return response.data;
  }

  async removeGroupMember(courseId: string, groupId: string, userId: string): Promise<void> {
    await this.http.delete(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/groups/${encodeURIComponent(groupId)}/users/${encodeURIComponent(userId)}`
    );
  }

  // ── Terms ────────────────────────────────────────────

  async listTerms(options?: {
    offset?: number;
    limit?: number;
  }): Promise<PaginatedResponse<BlackboardTerm>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get('/learn/api/public/v1/terms', { params });
    return response.data;
  }

  async getTerm(termId: string): Promise<BlackboardTerm> {
    let response = await this.http.get(
      `/learn/api/public/v1/terms/${encodeURIComponent(termId)}`
    );
    return response.data;
  }

  // ── Attendance ───────────────────────────────────────

  async listAttendanceMeetings(
    courseId: string,
    options?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<BlackboardAttendanceMeeting>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/meetings`,
      { params }
    );
    return response.data;
  }

  async createAttendanceMeeting(
    courseId: string,
    data: {
      start?: string;
      end?: string;
      title?: string;
      description?: string;
    }
  ): Promise<BlackboardAttendanceMeeting> {
    if (!data.title || !data.start || !data.end)
      throw createApiServiceError(
        'title, start, and end are required to create an attendance meeting.'
      );
    validateDateRange(data.start, data.end);
    let response = await this.http.post(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/meetings`,
      { ...data, courseId, description: data.description ?? '' }
    );
    return response.data;
  }

  async listAttendanceRecords(
    courseId: string,
    meetingId: string,
    options?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<BlackboardAttendanceRecord>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/meetings/${encodeURIComponent(meetingId)}/users`,
      { params }
    );
    return response.data;
  }

  async updateAttendanceRecord(
    courseId: string,
    meetingId: string,
    userId: string,
    data: {
      status: string;
    }
  ): Promise<BlackboardAttendanceRecord> {
    let status = { PRESENT: 'Present', LATE: 'Late', ABSENT: 'Absent', EXCUSED: 'Excused' }[
      data.status
    ];
    if (!status) throw createApiServiceError('Unsupported attendance status.');
    let path = `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/meetings/${encodeURIComponent(meetingId)}/users`;
    let body = { meetingId, userId, status };
    try {
      let response = await this.http.patch(`${path}/${encodeURIComponent(userId)}`, body);
      return response.data;
    } catch (error) {
      if (
        !isApiErrorRecord(error) ||
        !isApiErrorRecord(error.data) ||
        String(error.data.upstreamStatus) !== '404'
      )
        throw error;
      let response = await this.http.post(path, body);
      return response.data;
    }
  }

  // ── Calendar ─────────────────────────────────────────

  async listCalendarItems(options?: {
    courseId?: string;
    type?: string;
    since?: string;
    until?: string;
    offset?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Record<string, any>>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (
      options?.type &&
      !['Course', 'GradebookColumn', 'Institution', 'OfficeHours', 'Personal'].includes(
        options.type
      )
    )
      throw createApiServiceError('Unsupported calendar item type.');
    if (options?.since && options.until) {
      validateDateRange(options.since, options.until);
      if (Date.parse(options.until) - Date.parse(options.since) > 16 * 7 * 86400000)
        throw createApiServiceError('Calendar date ranges cannot exceed 16 weeks.');
    }
    if (options?.courseId) params.courseId = options.courseId;
    if (options?.type) params.type = options.type;
    if (options?.since) params.since = options.since;
    if (options?.until) params.until = options.until;
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get('/learn/api/public/v1/calendars/items', { params });
    return response.data;
  }

  async createCalendarItem(data: {
    type: string;
    calendarId: string;
    title: string;
    description?: string;
    location?: string;
    start: string;
    end: string;
    recurrence?: Record<string, unknown>;
    ltiLaunchDeepLink?: {
      placementHandle?: string;
      uuid?: string;
      url?: string;
      title?: string;
      customParameters?: Record<string, string>;
    };
  }): Promise<Record<string, any>> {
    if (!['Course', 'Institution', 'OfficeHours', 'Personal'].includes(data.type))
      throw createApiServiceError(
        'Calendar type must be Course, Institution, OfficeHours, or Personal. GradebookColumn items are created through grade columns.'
      );
    if (data.type === 'OfficeHours' && !data.recurrence)
      throw createApiServiceError('OfficeHours items require recurrence settings.');
    validateDateRange(data.start, data.end);
    if (data.recurrence) {
      let recurrence = data.recurrence;
      if (recurrence.count === undefined && !recurrence.until)
        throw createApiServiceError('Recurrence requires count or until.');
      for (let [key, minimum, maximum] of [
        ['count', 1, 2147483647],
        ['interval', 1, 100],
        ['monthRepeatDay', 1, 31],
        ['monthPosition', -1, 4]
      ] as const) {
        let value = recurrence[key];
        if (
          value !== undefined &&
          (typeof value !== 'number' ||
            !Number.isSafeInteger(value) ||
            value < minimum ||
            value > maximum ||
            (key === 'monthPosition' && value === 0))
        )
          throw createApiServiceError(`Invalid recurrence ${key}.`);
      }
      if (
        recurrence.frequency === 'Monthly' &&
        recurrence.monthRepeatDay === undefined &&
        (recurrence.monthPosition === undefined || !recurrence.repeatDay)
      )
        throw createApiServiceError(
          'Monthly recurrence requires monthRepeatDay or both monthPosition and repeatDay.'
        );
      if (
        recurrence.frequency === 'Weekly' &&
        (!Array.isArray(recurrence.weekDays) || recurrence.weekDays.length === 0)
      )
        throw createApiServiceError('Weekly recurrence requires weekDays.');
    }
    let response = await this.http.post('/learn/api/public/v1/calendars/items', data);
    return response.data;
  }

  async listCalendars(options?: {
    offset?: number;
    limit?: number;
  }): Promise<PaginatedResponse<{ id: string; name: string }>> {
    validatePagination(options);
    let response = await this.http.get('/learn/api/public/v1/calendars', { params: options });
    return response.data;
  }

  // ── Data Sources ─────────────────────────────────────

  async listDataSources(options?: {
    offset?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Record<string, any>>> {
    validatePagination(options);
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get('/learn/api/public/v1/dataSources', { params });
    return response.data;
  }
}

export let createClient = (ctx: {
  auth: { token: string; baseUrl?: string };
  config: unknown;
}) => {
  let legacyBaseUrl =
    isApiErrorRecord(ctx.config) && typeof ctx.config.baseUrl === 'string'
      ? ctx.config.baseUrl
      : undefined;
  let baseUrl = ctx.auth.baseUrl ?? legacyBaseUrl;
  if (!baseUrl)
    throw createApiServiceError('Reconnect Blackboard Learn to save the instance URL.');
  return new Client({ baseUrl, token: ctx.auth.token });
};

let validatePagination = (options?: { offset?: number; limit?: number }) => {
  validateWholeNumber(options?.offset, 'offset', 0);
  validateWholeNumber(options?.limit, 'limit', 1);
};

export let validateWholeNumber = (value: number | undefined, name: string, minimum = 0) => {
  if (
    value !== undefined &&
    (!Number.isSafeInteger(value) || value < minimum || value > 2147483647)
  ) {
    throw createApiServiceError(
      `${name} must be a whole number between ${minimum} and 2147483647.`
    );
  }
};

export let validateDateRange = (start: string, end: string) => {
  if (
    !Number.isFinite(Date.parse(start)) ||
    !Number.isFinite(Date.parse(end)) ||
    Date.parse(start) >= Date.parse(end)
  ) {
    throw createApiServiceError('start and end must be valid dates with start before end.');
  }
};
