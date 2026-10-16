import { Slate } from 'slates';
import { toolCategories } from './categories';
import { spec } from './spec';
import {
  assessIpRiskTool,
  geolocateIpTool,
  getCountryInfoTool,
  getTimezoneInfoTool,
  listAsnPeersTool,
  lookupAsnTool,
  lookupNetworksByCidrTool,
  lookupNetworkTool,
  reverseGeocodeTool,
  validatePhoneNumberTool,
  verifyEmailTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    geolocateIpTool,
    assessIpRiskTool,
    reverseGeocodeTool,
    validatePhoneNumberTool,
    verifyEmailTool,
    lookupAsnTool,
    lookupNetworkTool,
    getCountryInfoTool,
    getTimezoneInfoTool,
    listAsnPeersTool,
    lookupNetworksByCidrTool
  ],
  toolCategories,
  triggers: []
});
