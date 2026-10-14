import { Slate } from 'slates';
import { spec } from './spec';
import {
  deleteImage,
  getDataStoreFields,
  getImageStats,
  getWidgetStats,
  listBeePluginUsers,
  listImages,
  listMaps,
  manageDataStoreRecord,
  manageMapLocation,
  managePhotoshopImage,
  suspendWidgetUser,
  updateTimer,
  whoAmI
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getDataStoreFields,
    manageDataStoreRecord,
    updateTimer,
    listMaps,
    manageMapLocation,
    listImages,
    getImageStats,
    deleteImage,
    managePhotoshopImage,
    getWidgetStats,
    suspendWidgetUser,
    whoAmI,
    listBeePluginUsers
  ],
  triggers: []
});
