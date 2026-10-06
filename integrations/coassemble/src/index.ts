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
  triggers: []
});
