import { Slate } from 'slates';
import { spec } from './spec';
import {
  buyImage,
  deleteGenerations,
  generateImage,
  getCredits,
  getDownloadHistory,
  getGeneration,
  listGenerations,
  retryGeneration,
  searchImages,
  updateGeneration,
  whoAmI
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    generateImage,
    searchImages,
    buyImage,
    getDownloadHistory,
    getGeneration,
    listGenerations,
    updateGeneration,
    retryGeneration,
    deleteGenerations,
    getCredits,
    whoAmI
  ],
  triggers: []
});
