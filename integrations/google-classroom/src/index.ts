import { Slate } from 'slates';
import { spec } from './spec';
import {
  createCourse,
  createCoursework,
  deleteCourse,
  deleteCoursework,
  getCourse,
  getUserProfile,
  listCourses,
  listCoursework,
  listRoster,
  manageAnnouncements,
  manageCourseworkMaterials,
  manageGuardians,
  manageInvitations,
  manageRoster,
  manageRubrics,
  manageSubmissions,
  manageTopics,
  updateCourse,
  updateCoursework
} from './tools';
import {
  announcementChanges,
  courseRosterChanges,
  courseworkChanges,
  inboundWebhook
} from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCourses,
    getCourse,
    createCourse,
    updateCourse,
    deleteCourse,
    listRoster,
    manageRoster,
    manageInvitations,
    listCoursework,
    createCoursework,
    updateCoursework,
    deleteCoursework,
    manageSubmissions,
    manageAnnouncements,
    manageTopics,
    manageCourseworkMaterials,
    manageGuardians,
    getUserProfile,
    manageRubrics
  ],
  triggers: [inboundWebhook, courseRosterChanges, courseworkChanges, announcementChanges]
});
