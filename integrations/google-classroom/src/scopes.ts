import { anyOf } from 'slates';

export let googleClassroomScopes = {
  classroomCourses: 'https://www.googleapis.com/auth/classroom.courses',
  classroomCoursesReadonly: 'https://www.googleapis.com/auth/classroom.courses.readonly',
  classroomRosters: 'https://www.googleapis.com/auth/classroom.rosters',
  classroomRostersReadonly: 'https://www.googleapis.com/auth/classroom.rosters.readonly',
  classroomCourseworkMe: 'https://www.googleapis.com/auth/classroom.coursework.me',
  classroomCourseworkMeReadonly:
    'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
  classroomCourseworkStudents: 'https://www.googleapis.com/auth/classroom.coursework.students',
  classroomCourseworkStudentsReadonly:
    'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
  classroomCourseworkmaterials:
    'https://www.googleapis.com/auth/classroom.courseworkmaterials',
  classroomCourseworkmaterialsReadonly:
    'https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly',
  classroomAnnouncements: 'https://www.googleapis.com/auth/classroom.announcements',
  classroomAnnouncementsReadonly:
    'https://www.googleapis.com/auth/classroom.announcements.readonly',
  classroomTopics: 'https://www.googleapis.com/auth/classroom.topics',
  classroomTopicsReadonly: 'https://www.googleapis.com/auth/classroom.topics.readonly',
  classroomGuardianlinksStudents:
    'https://www.googleapis.com/auth/classroom.guardianlinks.students',
  classroomGuardianlinksStudentsReadonly:
    'https://www.googleapis.com/auth/classroom.guardianlinks.students.readonly',
  classroomGuardianlinksMeReadonly:
    'https://www.googleapis.com/auth/classroom.guardianlinks.me.readonly',
  classroomProfileEmails: 'https://www.googleapis.com/auth/classroom.profile.emails',
  classroomProfilePhotos: 'https://www.googleapis.com/auth/classroom.profile.photos',
  classroomPushNotifications: 'https://www.googleapis.com/auth/classroom.push-notifications',
  classroomAddonsTeacher: 'https://www.googleapis.com/auth/classroom.addons.teacher',
  classroomAddonsStudent: 'https://www.googleapis.com/auth/classroom.addons.student',
  classroomStudentSubmissionsMeReadonly:
    'https://www.googleapis.com/auth/classroom.student-submissions.me.readonly',
  classroomStudentSubmissionsStudentsReadonly:
    'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

export let googleClassroomActionScopes = {
  listCourses: anyOf(
    googleClassroomScopes.classroomCourses,
    googleClassroomScopes.classroomCoursesReadonly
  ),
  getCourse: anyOf(
    googleClassroomScopes.classroomCourses,
    googleClassroomScopes.classroomCoursesReadonly
  ),
  createCourse: anyOf(googleClassroomScopes.classroomCourses),
  updateCourse: anyOf(googleClassroomScopes.classroomCourses),
  deleteCourse: anyOf(googleClassroomScopes.classroomCourses),
  listRoster: anyOf(
    googleClassroomScopes.classroomRosters,
    googleClassroomScopes.classroomRostersReadonly
  ),
  manageRoster: anyOf(googleClassroomScopes.classroomRosters),
  manageInvitations: anyOf(
    googleClassroomScopes.classroomRosters,
    googleClassroomScopes.classroomRostersReadonly
  ),
  listCoursework: anyOf(
    googleClassroomScopes.classroomCourseworkStudents,
    googleClassroomScopes.classroomCourseworkStudentsReadonly,
    googleClassroomScopes.classroomCourseworkMe,
    googleClassroomScopes.classroomCourseworkMeReadonly
  ),
  createCoursework: anyOf(
    googleClassroomScopes.classroomCourseworkStudents,
    googleClassroomScopes.classroomCourseworkMe
  ),
  updateCoursework: anyOf(googleClassroomScopes.classroomCourseworkStudents),
  deleteCoursework: anyOf(googleClassroomScopes.classroomCourseworkStudents),
  manageSubmissions: anyOf(
    googleClassroomScopes.classroomCourseworkStudents,
    googleClassroomScopes.classroomCourseworkStudentsReadonly,
    googleClassroomScopes.classroomCourseworkMe,
    googleClassroomScopes.classroomCourseworkMeReadonly,
    googleClassroomScopes.classroomStudentSubmissionsMeReadonly,
    googleClassroomScopes.classroomStudentSubmissionsStudentsReadonly
  ),
  manageAnnouncements: anyOf(
    googleClassroomScopes.classroomAnnouncements,
    googleClassroomScopes.classroomAnnouncementsReadonly
  ),
  manageTopics: anyOf(
    googleClassroomScopes.classroomTopics,
    googleClassroomScopes.classroomTopicsReadonly
  ),
  manageCourseworkMaterials: anyOf(
    googleClassroomScopes.classroomCourseworkmaterials,
    googleClassroomScopes.classroomCourseworkmaterialsReadonly
  ),
  manageGuardians: anyOf(
    googleClassroomScopes.classroomGuardianlinksStudents,
    googleClassroomScopes.classroomGuardianlinksStudentsReadonly,
    googleClassroomScopes.classroomGuardianlinksMeReadonly
  ),
  getUserProfile: anyOf(
    googleClassroomScopes.classroomProfileEmails,
    googleClassroomScopes.classroomProfilePhotos,
    googleClassroomScopes.classroomCoursesReadonly,
    googleClassroomScopes.classroomRostersReadonly
  ),
  manageRubrics: anyOf(
    googleClassroomScopes.classroomCourseworkStudents,
    googleClassroomScopes.classroomCourseworkStudentsReadonly
  ),
  inboundWebhook: anyOf(
    googleClassroomScopes.classroomCoursesReadonly,
    googleClassroomScopes.classroomCourses
  ),
  courseRosterChanges: anyOf(
    googleClassroomScopes.classroomRosters,
    googleClassroomScopes.classroomRostersReadonly
  ),
  courseworkChanges: anyOf(
    googleClassroomScopes.classroomCourseworkStudents,
    googleClassroomScopes.classroomCourseworkStudentsReadonly,
    googleClassroomScopes.classroomCourseworkMe,
    googleClassroomScopes.classroomCourseworkMeReadonly
  ),
  announcementChanges: anyOf(
    googleClassroomScopes.classroomAnnouncements,
    googleClassroomScopes.classroomAnnouncementsReadonly
  )
} as const;
