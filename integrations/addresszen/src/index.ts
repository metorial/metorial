import { Slate } from 'slates';
import { spec } from './spec';
import {
  getCurrentKeyInfo,
  getKeyInfo,
  getUsageStats,
  resolveAddress,
  searchAddresses,
  updateKeySettings,
  validateEmail,
  validatePhone,
  verifyAddress
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    searchAddresses,
    resolveAddress,
    verifyAddress,
    validateEmail,
    validatePhone,
    getKeyInfo,
    getUsageStats,
    getCurrentKeyInfo,
    updateKeySettings
  ],
  triggers: []
});
