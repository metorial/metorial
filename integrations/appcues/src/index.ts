import { Slate } from 'slates';
import { spec } from './spec';
import {
  createSegment,
  deleteSegment,
  deleteUserProfile,
  exportEvents,
  getExperience,
  getGroupProfile,
  getJobStatus,
  getSegment,
  getUserEvents,
  getUserProfile,
  listExperiences,
  listJobs,
  listSegments,
  listTags,
  manageSegmentMembers,
  publishExperience,
  trackUserEvent,
  updateGroupProfile,
  updateSegment,
  updateUserProfile
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listExperiences,
    getExperience,
    publishExperience,
    getUserProfile,
    updateUserProfile,
    deleteUserProfile,
    trackUserEvent,
    getUserEvents,
    getGroupProfile,
    updateGroupProfile,
    listSegments,
    getSegment,
    createSegment,
    updateSegment,
    deleteSegment,
    manageSegmentMembers,
    listTags,
    getJobStatus,
    listJobs,
    exportEvents
  ],
  triggers: []
});
