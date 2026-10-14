import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteJob,
  getBuild,
  getCurrentUser,
  getDevice,
  getDeviceStatus,
  getJob,
  getPlatformStatus,
  getTunnel,
  getUserConcurrency,
  listBuilds,
  listDevices,
  listJobs,
  listStorageFiles,
  listSupportedPlatforms,
  listTeams,
  listTunnels,
  listUsers,
  stopJob,
  stopTunnel,
  updateJob
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    listJobs,
    getJob,
    updateJob,
    stopJob,
    deleteJob,
    listBuilds,
    getBuild,
    getCurrentUser,
    getDevice,
    getTunnel,
    listDevices,
    getDeviceStatus,
    listTunnels,
    stopTunnel,
    getPlatformStatus,
    listSupportedPlatforms,
    listUsers,
    listTeams,
    getUserConcurrency,
    listStorageFiles
  ],
  triggers: []
});
