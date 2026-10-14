import { Slate } from 'slates';
import { spec } from './spec';
import {
  createMonitor,
  deleteMonitor,
  getCrawlerPages,
  getHistory,
  getMonitor,
  getNotificationContent,
  listFolders,
  listNotifications,
  manageFolder,
  moveItems,
  searchMonitors,
  updateMonitor
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    createMonitor,
    updateMonitor,
    getMonitor,
    deleteMonitor,
    searchMonitors,
    listNotifications,
    getHistory,
    listFolders,
    manageFolder,
    getCrawlerPages,
    getNotificationContent,
    moveItems
  ],
  triggers: []
});
