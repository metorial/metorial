import { createApiServiceError, createAxios, pickDefined } from 'slates';
import { brightspaceError } from './errors';
import { normalizeInstanceUrl } from './instance';
import { richTextInput } from './response';

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
    let baseUrl = normalizeInstanceUrl(config.instanceUrl);
    if (!config.token.trim())
      throw createApiServiceError('Reconnect Brightspace with a valid bearer token.', {
        reason: 'brightspace_missing_token'
      });
    for (let version of [config.lpVersion, config.leVersion, config.basVersion]) {
      if (!/^\d+\.\d+$/.test(version))
        throw createApiServiceError('Use a numeric Brightspace API version, such as 1.49.', {
          reason: 'brightspace_api_version'
        });
    }
    this.lpVersion = config.lpVersion;
    this.leVersion = config.leVersion;
    this.basVersion = config.basVersion;

    this.axios = createAxios({
      baseURL: baseUrl,
      timeout: 30_000,
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
    this.axios.interceptors.response.use(undefined, error => {
      throw brightspaceError(error);
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

  private async allPages(path: string): Promise<any> {
    let first = (await this.axios.get(path)).data;
    if (!Array.isArray(first?.Objects) || !first.Next) return first;
    let objects = [...first.Objects];
    let origin = new URL(this.axios.defaults.baseURL!);
    let expected = new URL(path, origin);
    let next = first.Next;
    let visited = new Set<string>([expected.href]);
    for (let page = 1; next; page++) {
      if (typeof next !== 'string' || page >= 100)
        throw createApiServiceError(
          'Brightspace returned too many pages or an invalid pagination link.',
          { reason: 'brightspace_pagination' }
        );
      let url: URL;
      try {
        url = new URL(next, expected);
      } catch (error) {
        throw createApiServiceError('Brightspace returned an invalid pagination link.', {
          reason: 'brightspace_pagination',
          parent: error
        });
      }
      if (
        url.origin !== origin.origin ||
        url.pathname.replace(/\/$/, '') !== expected.pathname.replace(/\/$/, '') ||
        url.username ||
        url.password ||
        url.hash ||
        visited.has(url.href)
      )
        throw createApiServiceError(
          'Brightspace returned an unsafe or repeated pagination link.',
          { reason: 'brightspace_pagination' }
        );
      visited.add(url.href);
      let result = (await this.axios.get(url.pathname + url.search)).data;
      if (!Array.isArray(result?.Objects))
        throw createApiServiceError('Brightspace returned an invalid result page.', {
          reason: 'brightspace_pagination'
        });
      objects.push(...result.Objects);
      next = result.Next;
    }
    return { ...first, Objects: objects, Next: null };
  }

  // ─── Users ──────────────────────────────────────────────────────

  async getWhoAmI(): Promise<any> {
    let response = await this.axios.get(this.lpUrl('/users/whoami'));
    return response.data;
  }

  async getUser(userId: string): Promise<any> {
    let response = await this.axios.get(this.lpUrl(`/users/${encodeURIComponent(userId)}`));
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
    OrgDefinedId?: string | null;
    FirstName: string;
    MiddleName?: string | null;
    LastName: string;
    ExternalEmail?: string | null;
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
    let current = await this.getUser(userId);
    let response = await this.axios.put(this.lpUrl(`/users/${encodeURIComponent(userId)}`), {
      OrgDefinedId: current.OrgDefinedId,
      FirstName: current.FirstName,
      MiddleName: current.MiddleName,
      LastName: current.LastName,
      ExternalEmail: current.ExternalEmail,
      UserName: current.UserName,
      Activation: current.Activation,
      Pronouns: null,
      ...pickDefined(userData)
    });
    return response.data;
  }

  async deleteUser(userId: string): Promise<void> {
    await this.axios.delete(this.lpUrl(`/users/${encodeURIComponent(userId)}`));
  }

  async getUserProfile(userId: string): Promise<any> {
    let response = await this.axios.get(
      this.lpUrl(`/profile/user/${encodeURIComponent(userId)}`)
    );
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
    let response = await this.axios.get(
      this.lpUrl(`/orgstructure/${encodeURIComponent(orgUnitId)}`)
    );
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
      this.lpUrl(`/orgstructure/${encodeURIComponent(orgUnitId)}/children/paged/`),
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
    let response = await this.axios.get(
      this.lpUrl(`/courses/${encodeURIComponent(orgUnitId)}`)
    );
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
    let [major, minor] = this.lpVersion.split('.').map(Number);
    let response = await this.axios.post(this.lpUrl('/courses/'), {
      ...courseData,
      ...(major! > 1 || minor! >= 59 ? { IsActive: true } : {})
    });
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
    let current = await this.getCourse(orgUnitId);
    let response = await this.axios.put(
      this.lpUrl(`/courses/${encodeURIComponent(orgUnitId)}`),
      {
        Name: current.Name,
        Code: current.Code,
        StartDate: current.StartDate,
        EndDate: current.EndDate,
        IsActive: current.IsActive,
        Description: richTextInput(current.Description),
        CanSelfRegister: current.CanSelfRegister,
        ...pickDefined({
          LocaleId: current.LocaleId,
          ForceLocale: current.ForceLocale,
          ShowAddressBook: current.ShowAddressBook
        }),
        ...pickDefined(courseData)
      }
    );
    return response.data;
  }

  async deleteCourse(orgUnitId: string): Promise<void> {
    await this.axios.delete(this.lpUrl(`/courses/${encodeURIComponent(orgUnitId)}`));
  }

  // ─── Course Templates ───────────────────────────────────────────

  async getCourseTemplate(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(
      this.lpUrl(`/coursetemplates/${encodeURIComponent(orgUnitId)}`)
    );
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
      this.lpUrl(
        `/enrollments/orgUnits/${encodeURIComponent(orgUnitId)}/users/${encodeURIComponent(userId)}`
      )
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

    let response = await this.axios.get(
      this.lpUrl(`/enrollments/users/${encodeURIComponent(userId)}/orgUnits/`),
      {
        params: query
      }
    );
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
      this.lpUrl(`/enrollments/orgUnits/${encodeURIComponent(orgUnitId)}/users/`),
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
    let response = await this.axios.get(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/classlist/`)
    );
    return response.data;
  }

  // ─── Grades ─────────────────────────────────────────────────────

  async listGradeObjects(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/grades/`)
    );
    return response.data;
  }

  async getGradeObject(orgUnitId: string, gradeObjectId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/grades/${encodeURIComponent(gradeObjectId)}`
      )
    );
    return response.data;
  }

  async createGradeObject(orgUnitId: string, gradeData: any): Promise<any> {
    let response = await this.axios.post(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/grades/`),
      gradeData
    );
    return response.data;
  }

  async updateGradeObject(
    orgUnitId: string,
    gradeObjectId: string,
    gradeData: any
  ): Promise<any> {
    let response = await this.axios.put(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/grades/${encodeURIComponent(gradeObjectId)}`
      ),
      gradeData
    );
    return response.data;
  }

  async deleteGradeObject(orgUnitId: string, gradeObjectId: string): Promise<void> {
    await this.axios.delete(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/grades/${encodeURIComponent(gradeObjectId)}`
      )
    );
  }

  async getGradeValue(orgUnitId: string, gradeObjectId: string, userId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/grades/${encodeURIComponent(gradeObjectId)}/values/${encodeURIComponent(userId)}`
      )
    );
    return response.data;
  }

  async setGradeValue(
    orgUnitId: string,
    gradeObjectId: string,
    userId: string,
    gradeValue: any
  ): Promise<any> {
    let current = await this.getGradeValue(orgUnitId, gradeObjectId, userId);
    await this.axios.put(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/grades/${encodeURIComponent(gradeObjectId)}/values/${encodeURIComponent(userId)}`
      ),
      {
        Comments: richTextInput(current?.Comments),
        PrivateComments: richTextInput(current?.PrivateComments),
        ...pickDefined(gradeValue)
      }
    );
    return this.getGradeValue(orgUnitId, gradeObjectId, userId);
  }

  async getGradeValues(orgUnitId: string, gradeObjectId: string): Promise<any> {
    return this.allPages(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/grades/${encodeURIComponent(gradeObjectId)}/values/`
      )
    );
  }

  async getFinalGrades(orgUnitId: string): Promise<any> {
    return this.allPages(this.leUrl(`/${encodeURIComponent(orgUnitId)}/grades/final/values/`));
  }

  async listGradeCategories(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/grades/categories/`)
    );
    return response.data;
  }

  // ─── Content ────────────────────────────────────────────────────

  async listContentModules(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/content/root/`)
    );
    return response.data;
  }

  async getContentModule(orgUnitId: string, moduleId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/content/modules/${encodeURIComponent(moduleId)}`
      )
    );
    return response.data;
  }

  async getModuleStructure(orgUnitId: string, moduleId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/content/modules/${encodeURIComponent(moduleId)}/structure/`
      )
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
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/content/root/`),
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
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/content/modules/${encodeURIComponent(parentModuleId)}/structure/`
      ),
      moduleData
    );
    return response.data;
  }

  async updateContentModule(
    orgUnitId: string,
    moduleId: string,
    moduleData: any
  ): Promise<any> {
    let current = await this.getContentModule(orgUnitId, moduleId);
    let response = await this.axios.put(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/content/modules/${encodeURIComponent(moduleId)}`
      ),
      {
        Type: 0,
        Title: current.Title,
        ShortTitle: current.ShortTitle,
        IsHidden: current.IsHidden,
        IsLocked: current.IsLocked,
        ModuleStartDate: current.ModuleStartDate,
        ModuleEndDate: current.ModuleEndDate,
        ModuleDueDate: current.ModuleDueDate,
        Description: richTextInput(current.Description),
        ...pickDefined(moduleData)
      }
    );
    return response.data;
  }

  async deleteContentModule(orgUnitId: string, moduleId: string): Promise<void> {
    await this.axios.delete(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/content/modules/${encodeURIComponent(moduleId)}`
      )
    );
  }

  async getContentTopic(orgUnitId: string, topicId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/content/topics/${encodeURIComponent(topicId)}`
      )
    );
    return response.data;
  }

  async updateContentTopic(orgUnitId: string, topicId: string, topicData: any): Promise<any> {
    let response = await this.axios.put(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/content/topics/${encodeURIComponent(topicId)}`
      ),
      topicData
    );
    return response.data;
  }

  async deleteContentTopic(orgUnitId: string, topicId: string): Promise<void> {
    await this.axios.delete(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/content/topics/${encodeURIComponent(topicId)}`
      )
    );
  }

  // ─── Assignments (Dropbox) ──────────────────────────────────────

  async listDropboxFolders(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/dropbox/folders/`)
    );
    return response.data;
  }

  async getDropboxFolder(orgUnitId: string, folderId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/dropbox/folders/${encodeURIComponent(folderId)}`
      )
    );
    return response.data;
  }

  async createDropboxFolder(orgUnitId: string, folderData: any): Promise<any> {
    let response = await this.axios.post(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/dropbox/folders/`),
      folderData
    );
    return response.data;
  }

  async updateDropboxFolder(
    orgUnitId: string,
    folderId: string,
    folderData: any
  ): Promise<any> {
    let current = await this.getDropboxFolder(orgUnitId, folderId);
    let update = {
      CategoryId: current.CategoryId,
      Name: current.Name,
      CustomInstructions: richTextInput(current.CustomInstructions),
      Availability: current.Availability,
      GroupTypeId: current.GroupTypeId,
      DueDate: current.DueDate,
      DisplayInCalendar: current.DisplayInCalendar,
      NotificationEmail: current.NotificationEmail,
      IsHidden: current.IsHidden,
      Assessment: current.Assessment
        ? { ScoreDenominator: current.Assessment.ScoreDenominator }
        : null,
      IsAnonymous: current.IsAnonymous,
      DropboxType: current.DropboxType,
      SubmissionType: current.SubmissionType,
      CompletionType: current.CompletionType,
      GradeItemId: current.GradeItemId,
      AllowOnlyUsersWithSpecialAccess: current.AllowOnlyUsersWithSpecialAccess,
      ...pickDefined(folderData),
      ...(folderData.Availability
        ? { Availability: { ...current.Availability, ...folderData.Availability } }
        : {})
    };
    if (!update.DueDate && !update.Availability?.StartDate && !update.Availability?.EndDate) {
      update.DisplayInCalendar = false;
    }
    let response = await this.axios.put(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/dropbox/folders/${encodeURIComponent(folderId)}`
      ),
      update
    );
    return response.data;
  }

  async deleteDropboxFolder(orgUnitId: string, folderId: string): Promise<void> {
    await this.axios.delete(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/dropbox/folders/${encodeURIComponent(folderId)}`
      )
    );
  }

  async getDropboxSubmissions(orgUnitId: string, folderId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/dropbox/folders/${encodeURIComponent(folderId)}/submissions/`
      )
    );
    return response.data;
  }

  async getDropboxUserSubmissions(
    orgUnitId: string,
    folderId: string,
    userId: string
  ): Promise<any> {
    let [major, minor] = this.leVersion.split('.').map(Number);
    if (major! < 1 || (major === 1 && minor! < 88)) {
      let entities = await this.getDropboxSubmissions(orgUnitId, folderId);
      if (!Array.isArray(entities))
        throw createApiServiceError('Brightspace returned an invalid submission list.', {
          reason: 'brightspace_submission_response'
        });
      return entities.filter(
        entity =>
          entity.Entity?.EntityType === 'User' && String(entity.Entity.EntityId) === userId
      );
    }
    let response = await this.axios.get(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/dropbox/folders/${encodeURIComponent(folderId)}/submissions/user/${encodeURIComponent(userId)}`
      )
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
        `/${encodeURIComponent(orgUnitId)}/dropbox/folders/${encodeURIComponent(folderId)}/feedback/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`
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
        `/${encodeURIComponent(orgUnitId)}/dropbox/folders/${encodeURIComponent(folderId)}/feedback/${encodeURIComponent(entityType)}/${encodeURIComponent(entityId)}`
      ),
      feedback
    );
    return response.data;
  }

  // ─── Quizzes ────────────────────────────────────────────────────

  async listQuizzes(orgUnitId: string): Promise<any> {
    return this.allPages(this.leUrl(`/${encodeURIComponent(orgUnitId)}/quizzes/`));
  }

  async getQuiz(orgUnitId: string, quizId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/quizzes/${encodeURIComponent(quizId)}`)
    );
    return response.data;
  }

  async createQuiz(orgUnitId: string, quizData: any): Promise<any> {
    let response = await this.axios.post(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/quizzes/`),
      quizData
    );
    return response.data;
  }

  async updateQuiz(orgUnitId: string, quizId: string, quizData: any): Promise<any> {
    let response = await this.axios.put(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/quizzes/${encodeURIComponent(quizId)}`),
      quizData
    );
    return response.data;
  }

  async deleteQuiz(orgUnitId: string, quizId: string): Promise<void> {
    await this.axios.delete(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/quizzes/${encodeURIComponent(quizId)}`)
    );
  }

  async getQuizAttempts(orgUnitId: string, quizId: string): Promise<any> {
    return this.allPages(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/quizzes/${encodeURIComponent(quizId)}/attempts/`
      )
    );
  }

  async getQuizQuestions(orgUnitId: string, quizId: string): Promise<any> {
    return this.allPages(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/quizzes/${encodeURIComponent(quizId)}/questions/`
      )
    );
  }

  // ─── Discussions ────────────────────────────────────────────────

  async listDiscussionForums(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/discussions/forums/`)
    );
    return response.data;
  }

  async getDiscussionForum(orgUnitId: string, forumId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/discussions/forums/${encodeURIComponent(forumId)}`
      )
    );
    return response.data;
  }

  async createDiscussionForum(orgUnitId: string, forumData: any): Promise<any> {
    let response = await this.axios.post(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/discussions/forums/`),
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
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/discussions/forums/${encodeURIComponent(forumId)}`
      ),
      forumData
    );
    return response.data;
  }

  async deleteDiscussionForum(orgUnitId: string, forumId: string): Promise<void> {
    await this.axios.delete(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/discussions/forums/${encodeURIComponent(forumId)}`
      )
    );
  }

  async listDiscussionTopics(orgUnitId: string, forumId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/discussions/forums/${encodeURIComponent(forumId)}/topics/`
      )
    );
    return response.data;
  }

  async createDiscussionTopic(
    orgUnitId: string,
    forumId: string,
    topicData: any
  ): Promise<any> {
    let response = await this.axios.post(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/discussions/forums/${encodeURIComponent(forumId)}/topics/`
      ),
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
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/discussions/forums/${encodeURIComponent(forumId)}/topics/${encodeURIComponent(topicId)}`
      ),
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
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/discussions/forums/${encodeURIComponent(forumId)}/topics/${encodeURIComponent(topicId)}`
      )
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
    if (params?.threadsOnly !== undefined) query.threadsOnly = String(params.threadsOnly);
    if (params?.sort) query.sort = params.sort;

    let response = await this.axios.get(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/discussions/forums/${encodeURIComponent(forumId)}/topics/${encodeURIComponent(topicId)}/posts/`
      ),
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
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/discussions/forums/${encodeURIComponent(forumId)}/topics/${encodeURIComponent(topicId)}/posts/`
      ),
      postData
    );
    return response.data;
  }

  // ─── News (Announcements) ──────────────────────────────────────

  async listNews(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(this.leUrl(`/${encodeURIComponent(orgUnitId)}/news/`));
    return response.data;
  }

  async getNewsItem(orgUnitId: string, newsItemId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/news/${encodeURIComponent(newsItemId)}`)
    );
    return response.data;
  }

  async createNewsItem(orgUnitId: string, newsData: any): Promise<any> {
    let response = await this.axios.post(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/news/`),
      newsData
    );
    return response.data;
  }

  async updateNewsItem(orgUnitId: string, newsItemId: string, newsData: any): Promise<any> {
    let current = await this.getNewsItem(orgUnitId, newsItemId);
    let response = await this.axios.put(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/news/${encodeURIComponent(newsItemId)}`),
      {
        Title: current.Title,
        Body: current.Body,
        StartDate: current.StartDate,
        EndDate: current.EndDate,
        IsGlobal: current.IsGlobal,
        IsPublished: current.IsPublished,
        ShowOnlyInCourseOfferings: current.ShowOnlyInCourseOfferings,
        IsAuthorInfoShown: current.IsAuthorInfoShown,
        IsPinned: current.IsPinned,
        IsStartDateShown: current.IsStartDateShown,
        SortOrder: current.SortOrder,
        ...pickDefined(newsData)
      }
    );
    return response.data;
  }

  async deleteNewsItem(orgUnitId: string, newsItemId: string): Promise<void> {
    await this.axios.delete(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/news/${encodeURIComponent(newsItemId)}`)
    );
  }

  // ─── Calendar ───────────────────────────────────────────────────

  async listCalendarEvents(orgUnitId: string): Promise<any> {
    return this.allPages(this.leUrl(`/${encodeURIComponent(orgUnitId)}/calendar/events/`));
  }

  async getCalendarEvent(orgUnitId: string, eventId: string): Promise<any> {
    let response = await this.axios.get(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/calendar/event/${encodeURIComponent(eventId)}`
      )
    );
    return response.data;
  }

  async createCalendarEvent(orgUnitId: string, eventData: any): Promise<any> {
    let response = await this.axios.post(
      this.leUrl(`/${encodeURIComponent(orgUnitId)}/calendar/event/`),
      eventData
    );
    return response.data;
  }

  async updateCalendarEvent(orgUnitId: string, eventId: string, eventData: any): Promise<any> {
    let current = await this.getCalendarEvent(orgUnitId, eventId);
    let response = await this.axios.put(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/calendar/event/${encodeURIComponent(eventId)}`
      ),
      {
        Title: current.Title,
        Description: current.Description,
        StartDateTime: current.StartDateTime,
        EndDateTime: current.EndDateTime,
        StartDay: current.StartDay,
        EndDay: current.EndDay,
        GroupId: current.GroupId,
        RecurrenceInfo: current.RecurrenceInfo,
        LocationId: current.LocationId,
        LocationName: current.LocationName,
        AssociatedEntity: current.AssociatedEntity,
        VisibilityRestrictions: current.VisibilityRestrictions,
        ...pickDefined(eventData),
        ...(current.IsAllDayEvent
          ? {
              StartDateTime: null,
              EndDateTime: null,
              StartDay: eventData.StartDateTime ?? current.StartDay,
              EndDay: eventData.EndDateTime ?? current.EndDay
            }
          : {})
      }
    );
    return response.data;
  }

  async deleteCalendarEvent(orgUnitId: string, eventId: string): Promise<void> {
    await this.axios.delete(
      this.leUrl(
        `/${encodeURIComponent(orgUnitId)}/calendar/event/${encodeURIComponent(eventId)}`
      )
    );
  }

  // ─── Awards ─────────────────────────────────────────────────────

  async listAwards(): Promise<any> {
    return this.allPages(this.basUrl('/awards/'));
  }

  async getAward(awardId: string): Promise<any> {
    let response = await this.axios.get(this.basUrl(`/awards/${encodeURIComponent(awardId)}`));
    return response.data;
  }

  async issueAward(orgUnitId: string, issueData: any): Promise<any> {
    let response = await this.axios.post(
      this.basUrl(`/orgunits/${encodeURIComponent(orgUnitId)}/issued/`),
      issueData
    );
    return response.data;
  }

  async getUserAwards(userId: string): Promise<any> {
    return this.allPages(this.basUrl(`/issued/users/${encodeURIComponent(userId)}/`));
  }

  async listOrgUnitAssociations(orgUnitId: string): Promise<any> {
    return this.allPages(
      this.basUrl(`/orgunits/${encodeURIComponent(orgUnitId)}/associations/`)
    );
  }

  async revokeAward(issuedId: string): Promise<void> {
    await this.axios.delete(this.basUrl(`/issued/${encodeURIComponent(issuedId)}`));
  }

  // ─── Groups ─────────────────────────────────────────────────────

  async listGroupCategories(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(
      this.lpUrl(`/${encodeURIComponent(orgUnitId)}/groupcategories/`)
    );
    return response.data;
  }

  async getGroupCategory(orgUnitId: string, groupCategoryId: string): Promise<any> {
    let response = await this.axios.get(
      this.lpUrl(
        `/${encodeURIComponent(orgUnitId)}/groupcategories/${encodeURIComponent(groupCategoryId)}`
      )
    );
    return response.data;
  }

  async listGroups(orgUnitId: string, groupCategoryId: string): Promise<any> {
    let response = await this.axios.get(
      this.lpUrl(
        `/${encodeURIComponent(orgUnitId)}/groupcategories/${encodeURIComponent(groupCategoryId)}/groups/`
      )
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
        `/${encodeURIComponent(orgUnitId)}/groupcategories/${encodeURIComponent(groupCategoryId)}/groups/${encodeURIComponent(groupId)}/enrollments/`
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
        `/${encodeURIComponent(orgUnitId)}/groupcategories/${encodeURIComponent(groupCategoryId)}/groups/${encodeURIComponent(groupId)}/enrollments/${encodeURIComponent(userId)}`
      )
    );
  }

  // ─── Sections ───────────────────────────────────────────────────

  async listSections(orgUnitId: string): Promise<any> {
    let response = await this.axios.get(
      this.lpUrl(`/${encodeURIComponent(orgUnitId)}/sections/`)
    );
    return response.data;
  }

  async getSection(orgUnitId: string, sectionId: string): Promise<any> {
    let response = await this.axios.get(
      this.lpUrl(`/${encodeURIComponent(orgUnitId)}/sections/${encodeURIComponent(sectionId)}`)
    );
    return response.data;
  }

  async createSection(orgUnitId: string, sectionData: any): Promise<any> {
    let response = await this.axios.post(
      this.lpUrl(`/${encodeURIComponent(orgUnitId)}/sections/`),
      sectionData
    );
    return response.data;
  }

  async enrollUserInSection(
    orgUnitId: string,
    sectionId: string,
    enrollmentData: any
  ): Promise<void> {
    await this.axios.post(
      this.lpUrl(
        `/${encodeURIComponent(orgUnitId)}/sections/${encodeURIComponent(sectionId)}/enrollments/`
      ),
      enrollmentData
    );
  }

  // ─── Roles ──────────────────────────────────────────────────────

  async listRoles(): Promise<any> {
    let response = await this.axios.get(this.lpUrl('/roles/'));
    return response.data;
  }
}
