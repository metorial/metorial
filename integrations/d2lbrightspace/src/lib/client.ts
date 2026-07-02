import { createAxios } from 'slates';

export interface BrightspaceConfig {
  instanceUrl: string;
  token: string;
  lpVersion: string;
  leVersion: string;
  basVersion: string;
}

export class BrightspaceClient {
  private axios: ReturnType<typeof createAxios>;
  private lpVersion: string;
  private leVersion: string;
  private basVersion: string;

  constructor(config: BrightspaceConfig) {
    let baseUrl = config.instanceUrl.replace(/\/+$/, '');
    this.lpVersion = config.lpVersion;
    this.leVersion = config.leVersion;
    this.basVersion = config.basVersion;

    this.axios = createAxios({
      baseURL: baseUrl,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // ─── URL helpers ────────────────────────────────────────────────

  lpUrl(path: string): string {
    return `/d2l/api/lp/${this.lpVersion}${path}`;
  }

  leUrl(path: string): string {
    return `/d2l/api/le/${this.leVersion}${path}`;
  }

  basUrl(path: string): string {
    return `/d2l/api/bas/${this.basVersion}${path}`;
  }

  // ─── Users ──────────────────────────────────────────────────────

  async getWhoAmI(): Promise<any> {
    let response = await this.axios.get(this.lpUrl('/users/whoami'));
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.axios.get(this.lpUrl(`/users/${userId}`));
    return response.data;
  }

  async listUsers(params?: {
    orgDefinedId?: string;
    userName?: string;
    externalEmail?: string;
    bookmark?: string;
  }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.orgDefinedId) query.orgDefinedId = params.orgDefinedId;
    if (params?.userName) query.userName = params.userName;
    if (params?.externalEmail) query.externalEmail = params.externalEmail;
    if (params?.bookmark) query.bookmark = params.bookmark;

    let response = await this.axios.get(this.lpUrl('/users/'), { params: query });
    return response.data;
  }

  async createUser(userData: {
    OrgDefinedId?: string;
    FirstName: string;
    MiddleName?: string;
    LastName: string;
    ExternalEmail?: string;
    UserName: string;
    RoleId: number;
    IsActive: boolean;
    SendCreationEmail?: boolean;
  }): Promise<any> {
    let response = await this.axios.post(this.lpUrl('/users/'), userData);
    return response.data;
  }

  async updateUser(
    userId: string,
    userData: {
      OrgDefinedId?: string;
      FirstName?: string;
      MiddleName?: string;
      LastName?: string;
      ExternalEmail?: string;
      UserName?: string;
      Activation?: { IsActive: boolean };
    }
  ): Promise<any> {
    let response = await this.axios.put(this.lpUrl(`/users/${userId}`), userData);
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.axios.delete(this.lpUrl(`/users/${userId}`));
  }

  async getUserProfile(userId: string): Promise<any> {
    let response = await this.axios.get(this.lpUrl(`/profile/user/${userId}`));
    return response.data;
  }

  async getMyProfile(): Promise<any> {
    let response = await this.axios.get(this.lpUrl('/profile/myProfile'));
    return response.data;
  }

  // ─── Org Units ──────────────────────────────────────────────────

  async listOrgUnits(params?: {
    orgUnitType?: string;
    orgUnitCode?: string;
    orgUnitName?: string;
    bookmark?: string;
    exactOrgUnitName?: string;
  }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.orgUnitType) query.orgUnitType = params.orgUnitType;
    if (params?.orgUnitCode) query.orgUnitCode = params.orgUnitCode;
    if (params?.orgUnitName) query.orgUnitName = params.orgUnitName;
    if (params?.bookmark) query.bookmark = params.bookmark;
    if (params?.exactOrgUnitName) query.exactOrgUnitName = params.exactOrgUnitName;

    let response = await this.axios.get(this.lpUrl('/orgstructure/'), { params: query });
    return response.data;
  }

  async getOrgUnit(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.lpUrl(`/orgstructure/${orgUnitId}`));
    return response.data;
  }

  async createOrgUnit(orgUnitData: {
    Type: number;
    Name: string;
    Code: string;
    Parents: number[];
  }): Promise<any> {
    let response = await this.axios.post(this.lpUrl('/orgstructure/'), orgUnitData);
    return response.data;
  }

  async getOrgUnitChildren(orgUnitId: string, params?: { bookmark?: string }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.bookmark) query.bookmark = params.bookmark;
    let response = await this.axios.get(
      this.lpUrl(`/orgstructure/${orgUnitId}/children/paged/`),
      { params: query }
    );
    return response.data;
  }

  async getOrgUnitTypes(): Promise<any> {
    let response = await this.axios.get(this.lpUrl('/outypes/'));
    return response.data;
  }

  // ─── Courses ────────────────────────────────────────────────────

  async getCourse(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.lpUrl(`/courses/${orgUnitId}`));
    return response.data;
  }

  async createCourse(courseData: {
    Name: string;
    Code: string;
    Path?: string;
    CourseTemplateId: number;
    SemesterId?: number | null;
    StartDate?: string | null;
    EndDate?: string | null;
    LocaleId?: number | null;
    ForceLocale?: boolean;
    ShowAddressBook?: boolean;
    Description?: { Content?: string; Type?: string } | null;
    CanSelfRegister?: boolean;
  }): Promise<any> {
    let response = await this.axios.post(this.lpUrl('/courses/'), courseData);
    return response.data;
  }

  async updateCourse(
    orgUnitId: string,
    courseData: {
      Name?: string;
      Code?: string;
      StartDate?: string | null;
      EndDate?: string | null;
      IsActive?: boolean;
      Description?: { Content?: string; Type?: string } | null;
      CanSelfRegister?: boolean;
    }
  ): Promise<any> {
    let response = await this.axios.put(this.lpUrl(`/courses/${orgUnitId}`), courseData);
    return response.data;
  }

  async deleteCourse(orgUnitId: string): Promise<void> {
    await this.axios.delete(this.lpUrl(`/courses/${orgUnitId}`));
  }

  // ─── Course Templates ───────────────────────────────────────────

  async getCourseTemplate(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.lpUrl(`/coursetemplates/${orgUnitId}`));
    return response.data;
  }

  async createCourseTemplate(templateData: {
    Name: string;
    Code: string;
    Path?: string;
    ParentOrgUnitIds: number[];
  }): Promise<any> {
    let response = await this.axios.post(this.lpUrl('/coursetemplates/'), templateData);
    return response.data;
  }

  // ─── Enrollments ────────────────────────────────────────────────

  async createEnrollment(enrollmentData: {
    OrgUnitId: number;
    UserId: number;
    RoleId: number;
  }): Promise<any> {
    let response = await this.axios.post(this.lpUrl('/enrollments/'), enrollmentData);
    return response.data;
  }

  async deleteEnrollment(orgUnitId: string, userId: string): Promise<any> {
    let response = await this.axios.delete(
      this.lpUrl(`/enrollments/orgUnits/${orgUnitId}/users/${userId}`)
    );
    return response.data;
  }

  async getUserEnrollments(
    userId: string,
    params?: {
      orgUnitTypeId?: string;
      roleId?: string;
      bookmark?: string;
    }
  ): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.orgUnitTypeId) query.orgUnitTypeId = params.orgUnitTypeId;
    if (params?.roleId) query.roleId = params.roleId;
    if (params?.bookmark) query.bookmark = params.bookmark;

    let response = await this.axios.get(this.lpUrl(`/enrollments/users/${userId}/orgUnits/`), {
      params: query
    });
    return response.data;
  }

  async getOrgUnitEnrollments(
    orgUnitId: string,
    params?: {
      roleId?: string;
      isActive?: string;
      bookmark?: string;
    }
  ): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.roleId) query.roleId = params.roleId;
    if (params?.isActive) query.isActive = params.isActive;
    if (params?.bookmark) query.bookmark = params.bookmark;

    let response = await this.axios.get(
      this.lpUrl(`/enrollments/orgUnits/${orgUnitId}/users/`),
      { params: query }
    );
    return response.data;
  }

  async getMyEnrollments(params?: {
    orgUnitTypeId?: string;
    bookmark?: string;
    sortBy?: string;
    isActive?: string;
    canAccess?: string;
  }): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.orgUnitTypeId) query.orgUnitTypeId = params.orgUnitTypeId;
    if (params?.bookmark) query.bookmark = params.bookmark;
    if (params?.sortBy) query.sortBy = params.sortBy;
    if (params?.isActive) query.isActive = params.isActive;
    if (params?.canAccess) query.canAccess = params.canAccess;

    let response = await this.axios.get(this.lpUrl('/enrollments/myenrollments/'), {
      params: query
    });
    return response.data;
  }

  async getClasslist(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${orgUnitId}/classlist/`));
    return response.data;
  }

  // ─── Grades ─────────────────────────────────────────────────────

  async listGradeObjects(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${orgUnitId}/grades/`));
    return response.data;
  }

  async getGradeObject(orgUnitId: string, gradeObjectId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${orgUnitId}/grades/${gradeObjectId}`));
    return response.data;
  }

  async createGradeObject(orgUnitId: string, gradeData: any): Promise<any> {
    let response = await this.axios.post(this.leUrl(`/${orgUnitId}/grades/`), gradeData);
    return response.data;
  }

  async updateGradeObject(
    orgUnitId: string,
    gradeObjectId: string,
    gradeData: any
  ): Promise<any> {
    let response = await this.axios.put(
      this.leUrl(`/${orgUnitId}/grades/${gradeObjectId}`),
      gradeData
    );
    return response.data;
  }

  async deleteGradeObject(orgUnitId: string, gradeObjectId: string): Promise<void> {
    await this.axios.delete(this.leUrl(`/${orgUnitId}/grades/${gradeObjectId}`));
  }

  async getGradeValue(orgUnitId: string, gradeObjectId: string, userId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${orgUnitId}/grades/${gradeObjectId}/values/${userId}`)
    );
    return response.data;
  }

  async setGradeValue(
    orgUnitId: string,
    gradeObjectId: string,
    userId: string,
    gradeValue: any
  ): Promise<any> {
    let response = await this.axios.put(
      this.leUrl(`/${orgUnitId}/grades/${gradeObjectId}/values/${userId}`),
      gradeValue
    );
    return response.data;
  }

  async getGradeValues(orgUnitId: string, gradeObjectId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${orgUnitId}/grades/${gradeObjectId}/values/`)
    );
    return response.data;
  }

  async getFinalGrades(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${orgUnitId}/grades/final/values/`));
    return response.data;
  }

  async listGradeCategories(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${orgUnitId}/grades/categories/`));
    return response.data;
  }

  // ─── Content ────────────────────────────────────────────────────

  async listContentModules(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${orgUnitId}/content/root/`));
    return response.data;
  }

  async getContentModule(orgUnitId: string, moduleId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${orgUnitId}/content/modules/${moduleId}`)
    );
    return response.data;
  }

  async getModuleStructure(orgUnitId: string, moduleId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${orgUnitId}/content/modules/${moduleId}/structure/`)
    );
    return response.data;
  }

  async createContentModule(
    orgUnitId: string,
    moduleData: {
      Title: string;
      ShortTitle?: string;
      Description?: { Content?: string; Type?: string };
      IsHidden?: boolean;
      IsLocked?: boolean;
      ModuleStartDate?: string | null;
      ModuleEndDate?: string | null;
      ModuleDueDate?: string | null;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      this.leUrl(`/${orgUnitId}/content/root/`),
      moduleData
    );
    return response.data;
  }

  async createChildModule(
    orgUnitId: string,
    parentModuleId: string,
    moduleData: {
      Title: string;
      ShortTitle?: string;
      Description?: { Content?: string; Type?: string };
      IsHidden?: boolean;
      IsLocked?: boolean;
      ModuleStartDate?: string | null;
      ModuleEndDate?: string | null;
      ModuleDueDate?: string | null;
    }
  ): Promise<any> {
    let response = await this.axios.post(
      this.leUrl(`/${orgUnitId}/content/modules/${parentModuleId}/structure/`),
      moduleData
    );
    return response.data;
  }

  async updateContentModule(
    orgUnitId: string,
    moduleId: string,
    moduleData: any
  ): Promise<any> {
    let response = await this.axios.put(
      this.leUrl(`/${orgUnitId}/content/modules/${moduleId}`),
      moduleData
    );
    return response.data;
  }

  async deleteContentModule(orgUnitId: string, moduleId: string): Promise<void> {
    await this.axios.delete(this.leUrl(`/${orgUnitId}/content/modules/${moduleId}`));
  }

  async getContentTopic(orgUnitId: string, topicId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${orgUnitId}/content/topics/${topicId}`));
    return response.data;
  }

  async updateContentTopic(orgUnitId: string, topicId: string, topicData: any): Promise<any> {
    let response = await this.axios.put(
      this.leUrl(`/${orgUnitId}/content/topics/${topicId}`),
      topicData
    );
    return response.data;
  }

  async deleteContentTopic(orgUnitId: string, topicId: string): Promise<void> {
    await this.axios.delete(this.leUrl(`/${orgUnitId}/content/topics/${topicId}`));
  }

  // ─── Assignments (Dropbox) ──────────────────────────────────────

  async listDropboxFolders(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${orgUnitId}/dropbox/folders/`));
    return response.data;
  }

  async getDropboxFolder(orgUnitId: string, folderId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${orgUnitId}/dropbox/folders/${folderId}`)
    );
    return response.data;
  }

  async createDropboxFolder(orgUnitId: string, folderData: any): Promise<any> {
    let response = await this.axios.post(
      this.leUrl(`/${orgUnitId}/dropbox/folders/`),
      folderData
    );
    return response.data;
  }

  async updateDropboxFolder(
    orgUnitId: string,
    folderId: string,
    folderData: any
  ): Promise<any> {
    let response = await this.axios.put(
      this.leUrl(`/${orgUnitId}/dropbox/folders/${folderId}`),
      folderData
    );
    return response.data;
  }

  async deleteDropboxFolder(orgUnitId: string, folderId: string): Promise<void> {
    await this.axios.delete(this.leUrl(`/${orgUnitId}/dropbox/folders/${folderId}`));
  }

  async getDropboxSubmissions(orgUnitId: string, folderId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${orgUnitId}/dropbox/folders/${folderId}/submissions/`)
    );
    return response.data;
  }

  async getDropboxUserSubmissions(
    orgUnitId: string,
    folderId: string,
    userId: string
  ): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${orgUnitId}/dropbox/folders/${folderId}/submissions/user/${userId}`)
    );
    return response.data;
  }

  async getDropboxFeedback(
    orgUnitId: string,
    folderId: string,
    entityType: string,
    entityId: string
  ): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(
        `/${orgUnitId}/dropbox/folders/${folderId}/feedback/${entityType}/${entityId}`
      )
    );
    return response.data;
  }

  async postDropboxFeedback(
    orgUnitId: string,
    folderId: string,
    entityType: string,
    entityId: string,
    feedback: any
  ): Promise<any> {
    let response = await this.axios.post(
      this.leUrl(
        `/${orgUnitId}/dropbox/folders/${folderId}/feedback/${entityType}/${entityId}`
      ),
      feedback
    );
    return response.data;
  }

  // ─── Quizzes ────────────────────────────────────────────────────

  async listQuizzes(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${orgUnitId}/quizzes/`));
    return response.data;
  }

  async getQuiz(orgUnitId: string, quizId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${orgUnitId}/quizzes/${quizId}`));
    return response.data;
  }

  async createQuiz(orgUnitId: string, quizData: any): Promise<any> {
    let response = await this.axios.post(this.leUrl(`/${orgUnitId}/quizzes/`), quizData);
    return response.data;
  }

  async updateQuiz(orgUnitId: string, quizId: string, quizData: any): Promise<any> {
    let response = await this.axios.put(
      this.leUrl(`/${orgUnitId}/quizzes/${quizId}`),
      quizData
    );
    return response.data;
  }

  async deleteQuiz(orgUnitId: string, quizId: string): Promise<void> {
    await this.axios.delete(this.leUrl(`/${orgUnitId}/quizzes/${quizId}`));
  }

  async getQuizAttempts(orgUnitId: string, quizId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${orgUnitId}/quizzes/${quizId}/attempts/`)
    );
    return response.data;
  }

  async getQuizQuestions(orgUnitId: string, quizId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${orgUnitId}/quizzes/${quizId}/questions/`)
    );
    return response.data;
  }

  // ─── Discussions ────────────────────────────────────────────────

  async listDiscussionForums(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${orgUnitId}/discussions/forums/`));
    return response.data;
  }

  async getDiscussionForum(orgUnitId: string, forumId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${orgUnitId}/discussions/forums/${forumId}`)
    );
    return response.data;
  }

  async createDiscussionForum(orgUnitId: string, forumData: any): Promise<any> {
    let response = await this.axios.post(
      this.leUrl(`/${orgUnitId}/discussions/forums/`),
      forumData
    );
    return response.data;
  }

  async updateDiscussionForum(
    orgUnitId: string,
    forumId: string,
    forumData: any
  ): Promise<any> {
    let response = await this.axios.put(
      this.leUrl(`/${orgUnitId}/discussions/forums/${forumId}`),
      forumData
    );
    return response.data;
  }

  async deleteDiscussionForum(orgUnitId: string, forumId: string): Promise<void> {
    await this.axios.delete(this.leUrl(`/${orgUnitId}/discussions/forums/${forumId}`));
  }

  async listDiscussionTopics(orgUnitId: string, forumId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${orgUnitId}/discussions/forums/${forumId}/topics/`)
    );
    return response.data;
  }

  async createDiscussionTopic(
    orgUnitId: string,
    forumId: string,
    topicData: any
  ): Promise<any> {
    let response = await this.axios.post(
      this.leUrl(`/${orgUnitId}/discussions/forums/${forumId}/topics/`),
      topicData
    );
    return response.data;
  }

  async updateDiscussionTopic(
    orgUnitId: string,
    forumId: string,
    topicId: string,
    topicData: any
  ): Promise<any> {
    let response = await this.axios.put(
      this.leUrl(`/${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}`),
      topicData
    );
    return response.data;
  }

  async deleteDiscussionTopic(
    orgUnitId: string,
    forumId: string,
    topicId: string
  ): Promise<void> {
    await this.axios.delete(
      this.leUrl(`/${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}`)
    );
  }

  async listDiscussionPosts(
    orgUnitId: string,
    forumId: string,
    topicId: string,
    params?: {
      pageSize?: number;
      pageNumber?: number;
      threadsOnly?: boolean;
      sort?: string;
    }
  ): Promise<any> {
    let query: Record<string, string> = {};
    if (params?.pageSize) query.pageSize = String(params.pageSize);
    if (params?.pageNumber) query.pageNumber = String(params.pageNumber);
    if (params?.threadsOnly) query.threadsOnly = 'true';
    if (params?.sort) query.sort = params.sort;

    let response = await this.axios.get(
      this.leUrl(`/${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}/posts/`),
      { params: query }
    );
    return response.data;
  }

  async createDiscussionPost(
    orgUnitId: string,
    forumId: string,
    topicId: string,
    postData: any
  ): Promise<any> {
    let response = await this.axios.post(
      this.leUrl(`/${orgUnitId}/discussions/forums/${forumId}/topics/${topicId}/posts/`),
      postData
    );
    return response.data;
  }

  // ─── News (Announcements) ──────────────────────────────────────

  async listNews(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${orgUnitId}/news/`));
    return response.data;
  }

  async getNewsItem(orgUnitId: string, newsItemId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${orgUnitId}/news/${newsItemId}`));
    return response.data;
  }

  async createNewsItem(orgUnitId: string, newsData: any): Promise<any> {
    let response = await this.axios.post(this.leUrl(`/${orgUnitId}/news/`), newsData);
    return response.data;
  }

  async updateNewsItem(orgUnitId: string, newsItemId: string, newsData: any): Promise<any> {
    let response = await this.axios.put(
      this.leUrl(`/${orgUnitId}/news/${newsItemId}`),
      newsData
    );
    return response.data;
  }

  async deleteNewsItem(orgUnitId: string, newsItemId: string): Promise<void> {
    await this.axios.delete(this.leUrl(`/${orgUnitId}/news/${newsItemId}`));
  }

  // ─── Calendar ───────────────────────────────────────────────────

  async listCalendarEvents(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${orgUnitId}/calendar/events/myEvents/`));
    return response.data;
  }

  async getCalendarEvent(orgUnitId: string, eventId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${orgUnitId}/calendar/event/${eventId}`));
    return response.data;
  }

  async createCalendarEvent(orgUnitId: string, eventData: any): Promise<any> {
    let response = await this.axios.post(
      this.leUrl(`/${orgUnitId}/calendar/event/`),
      eventData
    );
    return response.data;
  }

  async updateCalendarEvent(orgUnitId: string, eventId: string, eventData: any): Promise<any> {
    let response = await this.axios.put(
      this.leUrl(`/${orgUnitId}/calendar/event/${eventId}`),
      eventData
    );
    return response.data;
  }

  async deleteCalendarEvent(orgUnitId: string, eventId: string): Promise<void> {
    await this.axios.delete(this.leUrl(`/${orgUnitId}/calendar/event/${eventId}`));
  }

  // ─── Awards ─────────────────────────────────────────────────────

  async listAwards(): Promise<any> {
    let response = await this.axios.get(this.basUrl('/awards/'));
    return response.data;
  }

  async getAward(awardId: string): Promise<any> {
    let response = await this.axios.get(this.basUrl(`/awards/${awardId}`));
    return response.data;
  }

  async issueAward(orgUnitId: string, issueData: any): Promise<any> {
    let response = await this.axios.post(
      this.basUrl(`/orgunits/${orgUnitId}/issued/`),
      issueData
    );
    return response.data;
  }

  async getUserAwards(userId: string): Promise<any> {
    let response = await this.axios.get(this.basUrl(`/issued/users/${userId}/`));
    return response.data;
  }

  async listOrgUnitAssociations(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.basUrl(`/orgunits/${orgUnitId}/associations/`));
    return response.data;
  }

  async revokeAward(issuedId: string): Promise<void> {
    await this.axios.delete(this.basUrl(`/issued/${issuedId}`));
  }

  // ─── Groups ─────────────────────────────────────────────────────

  async listGroupCategories(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.lpUrl(`/${orgUnitId}/groupcategories/`));
    return response.data;
  }

  async getGroupCategory(orgUnitId: string, groupCategoryId: string): Promise<any> {
    let response = await this.axios.get(
      this.lpUrl(`/${orgUnitId}/groupcategories/${groupCategoryId}`)
    );
    return response.data;
  }

  async listGroups(orgUnitId: string, groupCategoryId: string): Promise<any> {
    let response = await this.axios.get(
      this.lpUrl(`/${orgUnitId}/groupcategories/${groupCategoryId}/groups/`)
    );
    return response.data;
  }

  async enrollUserInGroup(
    orgUnitId: string,
    groupCategoryId: string,
    groupId: string,
    userId: number
  ): Promise<void> {
    await this.axios.post(
      this.lpUrl(
        `/${orgUnitId}/groupcategories/${groupCategoryId}/groups/${groupId}/enrollments/`
      ),
      { UserId: userId }
    );
  }

  async removeUserFromGroup(
    orgUnitId: string,
    groupCategoryId: string,
    groupId: string,
    userId: string
  ): Promise<void> {
    await this.axios.delete(
      this.lpUrl(
        `/${orgUnitId}/groupcategories/${groupCategoryId}/groups/${groupId}/enrollments/${userId}`
      )
    );
  }

  // ─── Sections ───────────────────────────────────────────────────

  async listSections(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.lpUrl(`/${orgUnitId}/sections/`));
    return response.data;
  }

  async getSection(orgUnitId: string, sectionId: string): Promise<any> {
    let response = await this.axios.get(this.lpUrl(`/${orgUnitId}/sections/${sectionId}`));
    return response.data;
  }

  async createSection(orgUnitId: string, sectionData: any): Promise<any> {
    let response = await this.axios.post(this.lpUrl(`/${orgUnitId}/sections/`), sectionData);
    return response.data;
  }

  async enrollUserInSection(
    orgUnitId: string,
    sectionId: string,
    enrollmentData: any
  ): Promise<void> {
    await this.axios.post(
      this.lpUrl(`/${orgUnitId}/sections/${sectionId}/enrollments/`),
      enrollmentData
    );
  }

  // ─── Roles ──────────────────────────────────────────────────────

  async listRoles(): Promise<any> {
    let response = await this.axios.get(this.lpUrl('/roles/'));
    return response.data;
  }
}
