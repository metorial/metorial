import { Slate, toolCategory } from 'slates';
import { spec } from './spec';
import {
  autocompletePapers,
  getAuthor,
  getAuthorPapers,
  getCitations,
  getDatasets,
  getFileUrl,
  getPaper,
  getPaperAuthors,
  matchPaper,
  recommendPapers,
  searchAuthors,
  searchPapers,
  searchPapersBulk,
  searchSnippets
} from './tools';

export let provider = Slate.create({
  spec,
  tools: [
    searchPapers,
    getPaper,
    getCitations,
    searchAuthors,
    getAuthor,
    getAuthorPapers,
    recommendPapers,
    autocompletePapers,
    getDatasets,
    getPaperAuthors,
    matchPaper,
    searchPapersBulk,
    searchSnippets,
    getFileUrl
  ],
  toolCategories: [
    toolCategory({
      key: 'graph',
      name: 'Academic Graph',
      description:
        'Search papers and authors, retrieve metadata, explore citations, and find text snippets.',
      tools: [
        searchPapers,
        getPaper,
        getCitations,
        searchAuthors,
        getAuthor,
        getAuthorPapers,
        autocompletePapers,
        getPaperAuthors,
        matchPaper,
        searchPapersBulk,
        searchSnippets
      ]
    }),
    toolCategory({
      key: 'recommendations',
      name: 'Paper Recommendations',
      description: 'Find related papers from positive and negative examples.',
      tools: [recommendPapers]
    }),
    toolCategory({
      key: 'datasets',
      name: 'Datasets',
      description: 'Discover full-corpus releases and retrieve dataset files.',
      tools: [getDatasets, getFileUrl]
    })
  ],
  triggers: []
});
