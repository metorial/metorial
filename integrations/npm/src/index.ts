import { Slate } from 'slates';
import { spec } from './spec';
import {
  deprecatePackage,
  getDownloads,
  getPackage,
  getUserProfile,
  manageDistTags,
  manageTokens,
  manageTrustedPublishers,
  searchPackages
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    getPackage,
    searchPackages,
    getDownloads,
    manageDistTags,
    manageTokens,
    deprecatePackage,
    manageTrustedPublishers,
    getUserProfile
  ],
  triggers: []
});
