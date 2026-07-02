import { createAxios } from 'slates';

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

export interface BlackboardAssignment {
  id: string;
  courseId?: string;
  name: string;
  instructions?: string;
  description?: string;
  position?: number;
  fileUploadEnabled?: boolean;
  textSubmissionEnabled?: boolean;
  created?: string;
  modified?: string;
  gradeColumnId?: string;
  groupContent?: boolean;
  score?: {
    possible: number;
  };
  availability?: {
    available?: string;
    allowGuests?: boolean;
    adaptiveRelease?: {
      start?: string;
      end?: string;
    };
  };
  grading?: {
    due?: string;
    attemptsAllowed?: number;
    anonymousGrading?: {
      type?: string;
    };
  };
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
  id: string;
  courseId?: string;
  start?: string;
  end?: string;
  title?: string;
  created?: string;
  modified?: string;
}

export interface BlackboardAttendanceRecord {
  userId: string;
  meetingId?: string;
  status: string;
  modified?: string;
}

export class Client {
  private http: ReturnType<typeof createAxios>;

  constructor(params: { baseUrl: string; token: string }) {
    this.http = createAxios({
      baseURL: params.baseUrl.replace(/\/+$/, ''),
      headers: {
        Authorization: `Bearer ${params.token}`,
        'Content-Type': 'application/json'
      }
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
      duration?: { type?: string; start?: string; end?: string };
    };
    enrollment?: {
      type?: string;
      accessCode?: string;
    };
    allowGuests?: boolean;
  }): Promise<BlackboardCourse> {
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
        duration?: { type?: string; start?: string; end?: string };
      };
      enrollment?: {
        type?: string;
        accessCode?: string;
      };
      allowGuests?: boolean;
    }
  ): Promise<BlackboardCourse> {
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
      };
    }
  ): Promise<BlackboardGradeColumn> {
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
    let response = await this.http.post(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/announcements`,
      data
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
    let response = await this.http.patch(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/announcements/${encodeURIComponent(announcementId)}`,
      data
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
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get('/learn/api/public/v1/announcements', { params });
    return response.data;
  }

  // ── Assignments ──────────────────────────────────────

  async listAssignments(
    courseId: string,
    options?: {
      offset?: number;
      limit?: number;
    }
  ): Promise<PaginatedResponse<BlackboardAssignment>> {
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/contents`,
      { params }
    );
    return response.data;
  }

  async getAssignment(courseId: string, columnId: string): Promise<BlackboardAssignment> {
    let response = await this.http.get(
      `/learn/api/public/v2/courses/${encodeURIComponent(courseId)}/gradebook/columns/${encodeURIComponent(columnId)}`
    );
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
  ): Promise<PaginatedResponse<BlackboardMembership>> {
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
  ): Promise<BlackboardMembership> {
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
    }
  ): Promise<BlackboardAttendanceMeeting> {
    let response = await this.http.post(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/meetings`,
      data
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
    let response = await this.http.patch(
      `/learn/api/public/v1/courses/${encodeURIComponent(courseId)}/meetings/${encodeURIComponent(meetingId)}/users/${encodeURIComponent(userId)}`,
      data
    );
    return response.data;
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
    let params: Record<string, string> = {};
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
  }): Promise<Record<string, any>> {
    let response = await this.http.post('/learn/api/public/v1/calendars/items', data);
    return response.data;
  }

  // ── Data Sources ─────────────────────────────────────

  async listDataSources(options?: {
    offset?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Record<string, any>>> {
    let params: Record<string, string> = {};
    if (options?.offset !== undefined) params.offset = String(options.offset);
    if (options?.limit !== undefined) params.limit = String(options.limit);
    let response = await this.http.get('/learn/api/public/v1/dataSources', { params });
    return response.data;
  }
}
