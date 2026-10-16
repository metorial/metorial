import { Slate } from 'slates';
import { spec } from './spec';
import {
  createDataset,
  downloadCompetitionData,
  downloadDataset,
  downloadModelVersion,
  getCompetitionDetails,
  getDatasetDetails,
  getKernelDetails,
  getModelDetails,
  manageModel,
  manageModelVariation,
  pushKernel,
  searchCompetitions,
  searchDatasets,
  searchKernels,
  searchModels
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    downloadDataset,
    downloadCompetitionData,
    downloadModelVersion,
    searchCompetitions,
    getCompetitionDetails,
    searchDatasets,
    getDatasetDetails,
    createDataset,
    searchKernels,
    getKernelDetails,
    pushKernel,
    searchModels,
    getModelDetails,
    manageModel,
    manageModelVariation
  ],
  triggers: []
});
