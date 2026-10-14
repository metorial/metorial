import { Slate } from 'slates';
import { spec } from './spec';
import {
  calculateIsochrone,
  calculateMatrix,
  calculateRoute,
  clusterLocations,
  geocode,
  getOptimizationSolution,
  matchGpsTrace,
  optimizeRoutes
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    calculateRoute,
    optimizeRoutes,
    getOptimizationSolution,
    calculateMatrix,
    geocode,
    calculateIsochrone,
    matchGpsTrace,
    clusterLocations
  ],
  triggers: []
});
