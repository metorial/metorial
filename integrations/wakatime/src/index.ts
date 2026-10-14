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
  getExternalDurations,
  getFileUrl,
  getGoals,
  getHeartbeats,
  getInsights,
  getLeaderboard,
  getMachines,
  getOrganizations,
  getPrivateLeaderboards,
  getProjectCommit,
  getProjectCommits,
  getUserProfile,
  listProjects,
  manageDataExports
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    getCodingSummaries,
    getCodingStats,
    getDurations,
    getExternalDurations,
    getHeartbeats,
    createHeartbeat,
    deleteHeartbeat,
    listProjects,
    getProjectCommits,
    getProjectCommit,
    getGoals,
    createExternalDuration,
    getLeaderboard,
    getPrivateLeaderboards,
    getUserProfile,
    getAllTime,
    getInsights,
    getOrganizations,
    getMachines,
    manageDataExports,
    getFileUrl
  ],
  triggers: []
});
