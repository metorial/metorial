import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteClient,
  deleteTracking,
  deleteUser,
  duplicateCourse,
  exportScorm,
  generateCourse,
  getCourse,
  getSignedUrl,
  getTracking,
  listClients,
  listCourses,
  listUsers,
  manageCourseLifecycle,
  updateClient,
  updateUser
} from './tools';
import { courseProgress, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    listCourses,
    getCourse,
    getSignedUrl,
    duplicateCourse,
    manageCourseLifecycle,
    generateCourse,
    exportScorm,
    getTracking,
    deleteTracking,
    listClients,
    updateClient,
    deleteClient,
    listUsers,
    updateUser,
    deleteUser
  ],
  triggers: [inboundWebhook, courseProgress]
});
