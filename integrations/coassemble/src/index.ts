import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteClient,
  deleteTracking,
  deleteUser,
  duplicateCourse,
  exportScorm,
  generateCourse,
  getClient,
  getCourse,
  getCourseContent,
  getSignedUrl,
  getTracking,
  getUser,
  listClients,
  listCourses,
  listUsers,
  manageCourseLifecycle,
  updateClient,
  updateUser
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listCourses,
    getCourse,
    getCourseContent,
    getSignedUrl,
    duplicateCourse,
    manageCourseLifecycle,
    generateCourse,
    exportScorm,
    getTracking,
    deleteTracking,
    listClients,
    getClient,
    updateClient,
    deleteClient,
    listUsers,
    getUser,
    updateUser,
    deleteUser
  ],
  triggers: []
});
