import { Slate } from 'slates';
import { spec } from './spec';
import {
  analyzeImage,
  detectFaces,
  detectImageProperties,
  detectLabels,
  detectLandmarks,
  detectLogos,
  detectObjects,
  detectSafeSearch,
  detectText,
  detectWeb,
  getCropHints
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    analyzeImage,
    detectLabels,
    detectObjects,
    detectFaces,
    detectLandmarks,
    detectLogos,
    detectText,
    detectSafeSearch,
    detectImageProperties,
    getCropHints,
    detectWeb
  ],
  triggers: []
});
