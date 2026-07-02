import axios, { type AxiosInstance } from 'axios';

export class ClassroomClient {
  private http: AxiosInstance;

  constructor(config: { token: string }) {
    this.http = axios.create({
      baseURL: 'https://classroom.googleapis.com/v1',
      headers: {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      }
    });
  }

  // ── Courses ──

  async listCourses(params?: {
    studentId?: string;
    teacherId?: string;
    courseStates?: string[];
    pageSize?: number;
    pageToken?: string;
  }) {
    let queryParams: Record<string, any> = {};
    if (params?.studentId) queryParams.studentId = params.studentId;
    if (params?.teacherId) queryParams.teacherId = params.teacherId;
    if (params?.courseStates) queryParams.courseStates = params.courseStates;
    if (params?.pageSize) queryParams.pageSize = params.pageSize;
    if (params?.pageToken) queryParams.pageToken = params.pageToken;

    let response = await this.http.get('/courses', { params: queryParams });
    return response.data;
  }

  async getCourse(courseId: string) {
    let response = await this.http.get(`/courses/${courseId}`);
    return response.data;
  }

  async createCourse(course: {
    name: string;
    section?: string;
    descriptionHeading?: string;
    description?: string;
    room?: string;
    ownerId?: string;
    courseState?: string;
  }) {
    let response = await this.http.post('/courses', course);
    return response.data;
  }

  async updateCourse(courseId: string, course: Record<string, any>, updateMask: string) {
    let response = await this.http.patch(`/courses/${courseId}`, course, {
      params: { updateMask }
    });
    return response.data;
  }

  async deleteCourse(courseId: string) {
    let response = await this.http.delete(`/courses/${courseId}`);
    return response.data;
  }

  // ── Course Aliases ──

  async listCourseAliases(courseId: string, pageSize?: number, pageToken?: string) {
    let response = await this.http.get(`/courses/${courseId}/aliases`, {
      params: { pageSize, pageToken }
    });
    return response.data;
  }

  async createCourseAlias(courseId: string, alias: string) {
    let response = await this.http.post(`/courses/${courseId}/aliases`, { alias });
    return response.data;
  }

  async deleteCourseAlias(courseId: string, alias: string) {
    let response = await this.http.delete(
      `/courses/${courseId}/aliases/${encodeURIComponent(alias)}`
    );
    return response.data;
  }

  // ── Teachers ──

  async listTeachers(courseId: string, pageSize?: number, pageToken?: string) {
    let response = await this.http.get(`/courses/${courseId}/teachers`, {
      params: { pageSize, pageToken }
    });
    return response.data;
  }

  async getTeacher(courseId: string, userId: string) {
    let response = await this.http.get(`/courses/${courseId}/teachers/${userId}`);
    return response.data;
  }

  async addTeacher(courseId: string, userId: string) {
    let response = await this.http.post(`/courses/${courseId}/teachers`, { userId });
    return response.data;
  }

  async removeTeacher(courseId: string, userId: string) {
    let response = await this.http.delete(`/courses/${courseId}/teachers/${userId}`);
    return response.data;
  }

  // ── Students ──

  async listStudents(courseId: string, pageSize?: number, pageToken?: string) {
    let response = await this.http.get(`/courses/${courseId}/students`, {
      params: { pageSize, pageToken }
    });
    return response.data;
  }

  async getStudent(courseId: string, userId: string) {
    let response = await this.http.get(`/courses/${courseId}/students/${userId}`);
    return response.data;
  }

  async addStudent(courseId: string, enrollmentCode?: string, userId?: string) {
    let body: Record<string, any> = {};
    if (userId) body.userId = userId;
    let params: Record<string, any> = {};
    if (enrollmentCode) params.enrollmentCode = enrollmentCode;
    let response = await this.http.post(`/courses/${courseId}/students`, body, { params });
    return response.data;
  }

  async removeStudent(courseId: string, userId: string) {
    let response = await this.http.delete(`/courses/${courseId}/students/${userId}`);
    return response.data;
  }

  // ── Invitations ──

  async listInvitations(params?: {
    courseId?: string;
    userId?: string;
    pageSize?: number;
    pageToken?: string;
  }) {
    let response = await this.http.get('/invitations', { params });
    return response.data;
  }

  async createInvitation(courseId: string, userId: string, role: string) {
    let response = await this.http.post('/invitations', { courseId, userId, role });
    return response.data;
  }

  async deleteInvitation(invitationId: string) {
    let response = await this.http.delete(`/invitations/${invitationId}`);
    return response.data;
  }

  async acceptInvitation(invitationId: string) {
    let response = await this.http.post(`/invitations/${invitationId}:accept`);
    return response.data;
  }

  // ── CourseWork ──

  async listCourseWork(
    courseId: string,
    params?: {
      courseWorkStates?: string[];
      orderBy?: string;
      pageSize?: number;
      pageToken?: string;
    }
  ) {
    let response = await this.http.get(`/courses/${courseId}/courseWork`, { params });
    return response.data;
  }

  async getCourseWork(courseId: string, courseWorkId: string) {
    let response = await this.http.get(`/courses/${courseId}/courseWork/${courseWorkId}`);
    return response.data;
  }

  async createCourseWork(courseId: string, courseWork: Record<string, any>) {
    let response = await this.http.post(`/courses/${courseId}/courseWork`, courseWork);
    return response.data;
  }

  async updateCourseWork(
    courseId: string,
    courseWorkId: string,
    courseWork: Record<string, any>,
    updateMask: string
  ) {
    let response = await this.http.patch(
      `/courses/${courseId}/courseWork/${courseWorkId}`,
      courseWork,
      {
        params: { updateMask }
      }
    );
    return response.data;
  }

  async deleteCourseWork(courseId: string, courseWorkId: string) {
    let response = await this.http.delete(`/courses/${courseId}/courseWork/${courseWorkId}`);
    return response.data;
  }

  // ── Student Submissions ──

  async listStudentSubmissions(
    courseId: string,
    courseWorkId: string,
    params?: {
      userId?: string;
      states?: string[];
      late?: string;
      pageSize?: number;
      pageToken?: string;
    }
  ) {
    let response = await this.http.get(
      `/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions`,
      { params }
    );
    return response.data;
  }

  async getStudentSubmission(courseId: string, courseWorkId: string, submissionId: string) {
    let response = await this.http.get(
      `/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${submissionId}`
    );
    return response.data;
  }

  async patchStudentSubmission(
    courseId: string,
    courseWorkId: string,
    submissionId: string,
    submission: Record<string, any>,
    updateMask: string
  ) {
    let response = await this.http.patch(
      `/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${submissionId}`,
      submission,
      { params: { updateMask } }
    );
    return response.data;
  }

  async turnInStudentSubmission(courseId: string, courseWorkId: string, submissionId: string) {
    let response = await this.http.post(
      `/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${submissionId}:turnIn`
    );
    return response.data;
  }

  async returnStudentSubmission(courseId: string, courseWorkId: string, submissionId: string) {
    let response = await this.http.post(
      `/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${submissionId}:return`
    );
    return response.data;
  }

  async reclaimStudentSubmission(
    courseId: string,
    courseWorkId: string,
    submissionId: string
  ) {
    let response = await this.http.post(
      `/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${submissionId}:reclaim`
    );
    return response.data;
  }

  // ── CourseWork Materials ──

  async listCourseWorkMaterials(
    courseId: string,
    params?: {
      courseWorkMaterialStates?: string[];
      orderBy?: string;
      pageSize?: number;
      pageToken?: string;
    }
  ) {
    let response = await this.http.get(`/courses/${courseId}/courseWorkMaterials`, { params });
    return response.data;
  }

  async getCourseWorkMaterial(courseId: string, materialId: string) {
    let response = await this.http.get(
      `/courses/${courseId}/courseWorkMaterials/${materialId}`
    );
    return response.data;
  }

  async createCourseWorkMaterial(courseId: string, material: Record<string, any>) {
    let response = await this.http.post(`/courses/${courseId}/courseWorkMaterials`, material);
    return response.data;
  }

  async updateCourseWorkMaterial(
    courseId: string,
    materialId: string,
    material: Record<string, any>,
    updateMask: string
  ) {
    let response = await this.http.patch(
      `/courses/${courseId}/courseWorkMaterials/${materialId}`,
      material,
      { params: { updateMask } }
    );
    return response.data;
  }

  async deleteCourseWorkMaterial(courseId: string, materialId: string) {
    let response = await this.http.delete(
      `/courses/${courseId}/courseWorkMaterials/${materialId}`
    );
    return response.data;
  }

  // ── Announcements ──

  async listAnnouncements(
    courseId: string,
    params?: {
      announcementStates?: string[];
      orderBy?: string;
      pageSize?: number;
      pageToken?: string;
    }
  ) {
    let response = await this.http.get(`/courses/${courseId}/announcements`, { params });
    return response.data;
  }

  async getAnnouncement(courseId: string, announcementId: string) {
    let response = await this.http.get(`/courses/${courseId}/announcements/${announcementId}`);
    return response.data;
  }

  async createAnnouncement(courseId: string, announcement: Record<string, any>) {
    let response = await this.http.post(`/courses/${courseId}/announcements`, announcement);
    return response.data;
  }

  async updateAnnouncement(
    courseId: string,
    announcementId: string,
    announcement: Record<string, any>,
    updateMask: string
  ) {
    let response = await this.http.patch(
      `/courses/${courseId}/announcements/${announcementId}`,
      announcement,
      { params: { updateMask } }
    );
    return response.data;
  }

  async deleteAnnouncement(courseId: string, announcementId: string) {
    let response = await this.http.delete(
      `/courses/${courseId}/announcements/${announcementId}`
    );
    return response.data;
  }

  // ── Topics ──

  async listTopics(courseId: string, pageSize?: number, pageToken?: string) {
    let response = await this.http.get(`/courses/${courseId}/topics`, {
      params: { pageSize, pageToken }
    });
    return response.data;
  }

  async getTopic(courseId: string, topicId: string) {
    let response = await this.http.get(`/courses/${courseId}/topics/${topicId}`);
    return response.data;
  }

  async createTopic(courseId: string, name: string) {
    let response = await this.http.post(`/courses/${courseId}/topics`, { name });
    return response.data;
  }

  async updateTopic(courseId: string, topicId: string, name: string) {
    let response = await this.http.patch(
      `/courses/${courseId}/topics/${topicId}`,
      { name },
      { params: { updateMask: 'name' } }
    );
    return response.data;
  }

  async deleteTopic(courseId: string, topicId: string) {
    let response = await this.http.delete(`/courses/${courseId}/topics/${topicId}`);
    return response.data;
  }

  // ── Rubrics ──

  async listRubrics(
    courseId: string,
    courseWorkId: string,
    pageSize?: number,
    pageToken?: string
  ) {
    let response = await this.http.get(
      `/courses/${courseId}/courseWork/${courseWorkId}/rubrics`,
      { params: { pageSize, pageToken } }
    );
    return response.data;
  }

  async getRubric(courseId: string, courseWorkId: string, rubricId: string) {
    let response = await this.http.get(
      `/courses/${courseId}/courseWork/${courseWorkId}/rubrics/${rubricId}`
    );
    return response.data;
  }

  async createRubric(courseId: string, courseWorkId: string, rubric: Record<string, any>) {
    let response = await this.http.post(
      `/courses/${courseId}/courseWork/${courseWorkId}/rubrics`,
      rubric
    );
    return response.data;
  }

  async updateRubric(
    courseId: string,
    courseWorkId: string,
    rubricId: string,
    rubric: Record<string, any>,
    updateMask: string
  ) {
    let response = await this.http.patch(
      `/courses/${courseId}/courseWork/${courseWorkId}/rubrics/${rubricId}`,
      rubric,
      { params: { updateMask } }
    );
    return response.data;
  }

  async deleteRubric(courseId: string, courseWorkId: string, rubricId: string) {
    let response = await this.http.delete(
      `/courses/${courseId}/courseWork/${courseWorkId}/rubrics/${rubricId}`
    );
    return response.data;
  }

  // ── Guardians ──

  async listGuardians(studentId: string, pageSize?: number, pageToken?: string) {
    let response = await this.http.get(`/userProfiles/${studentId}/guardians`, {
      params: { pageSize, pageToken }
    });
    return response.data;
  }

  async getGuardian(studentId: string, guardianId: string) {
    let response = await this.http.get(`/userProfiles/${studentId}/guardians/${guardianId}`);
    return response.data;
  }

  async deleteGuardian(studentId: string, guardianId: string) {
    let response = await this.http.delete(
      `/userProfiles/${studentId}/guardians/${guardianId}`
    );
    return response.data;
  }

  async listGuardianInvitations(
    studentId: string,
    params?: {
      states?: string[];
      invitedEmailAddress?: string;
      pageSize?: number;
      pageToken?: string;
    }
  ) {
    let response = await this.http.get(`/userProfiles/${studentId}/guardianInvitations`, {
      params
    });
    return response.data;
  }

  async createGuardianInvitation(studentId: string, invitedEmailAddress: string) {
    let response = await this.http.post(`/userProfiles/${studentId}/guardianInvitations`, {
      invitedEmailAddress
    });
    return response.data;
  }

  async patchGuardianInvitation(studentId: string, invitationId: string, state: string) {
    let response = await this.http.patch(
      `/userProfiles/${studentId}/guardianInvitations/${invitationId}`,
      { state },
      { params: { updateMask: 'state' } }
    );
    return response.data;
  }

  // ── User Profiles ──

  async getUserProfile(userId: string) {
    let response = await this.http.get(`/userProfiles/${userId}`);
    return response.data;
  }

  // ── Push Notifications / Registrations ──

  async createRegistration(registration: {
    feed: {
      feedType: string;
      courseRosterChangesInfo?: { courseId: string };
      courseWorkChangesInfo?: { courseId: string };
    };
    cloudPubsubTopic: {
      topicName: string;
    };
  }) {
    let response = await this.http.post('/registrations', registration);
    return response.data;
  }
}
