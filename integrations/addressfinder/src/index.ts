import { Slate } from 'slates';
import { spec } from './spec';
import {
  addressAutocompleteTool,
  addressMetadataTool,
  addressVerificationTool,
  locationMetadataTool,
  locationSearchTool,
  poiAutocompleteTool,
  poiMetadataTool,
  reverseGeocodeTool,
  verifyEmailTool,
  verifyPhoneTool
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    addressAutocompleteTool,
    addressMetadataTool,
    addressVerificationTool,
    locationSearchTool,
    locationMetadataTool,
    poiAutocompleteTool,
    poiMetadataTool,
    reverseGeocodeTool,
    verifyEmailTool,
    verifyPhoneTool
  ],
  triggers: []
});
