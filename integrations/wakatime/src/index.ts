import { Slate } from 'slates';
import { spec } from './spec';
import {
  createExternalDuration,
  createHeartbeat,
  deleteHeartbeat,
  getAllTime,
  getCodingStats,
  getCodingSummaries,
  getDurations,
  getGoals,
  getHeartbeats,
  getInsights,
  getLeaderboard,
  getMachines,
  getOrganizations,
  getPrivateLeaderboards,
  getProjectCommits,
  getUserProfile,
  listProjects,
  manageDataExports
} from './tools';
import { codingActivityTrigger, goalProgressTrigger, inboundWebhook } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getCodingSummaries,
    getCodingStats,
    getDurations,
    getHeartbeats,
    createHeartbeat,
    deleteHeartbeat,
    listProjects,
    getProjectCommits,
    getGoals,
    createExternalDuration,
    getLeaderboard,
    getPrivateLeaderboards,
    getUserProfile,
    getAllTime,
    getInsights,
    getOrganizations,
    getMachines,
    manageDataExports
  ],
  triggers: [inboundWebhook, codingActivityTrigger, goalProgressTrigger]
});
