import { Slate, toolCategory } from 'slates';
import { spec } from './spec';
import {
  browseRecords,
  getRecommendations,
  getTaskStatus,
  indexSettings,
  manageAbTests,
  manageApiKeys,
  manageIndices,
  manageRecords,
  manageRules,
  manageSynonyms,
  monitoring,
  search,
  searchAnalytics,
  sendEvents
} from './tools';
export let provider = Slate.create({
  spec,
  tools: [
    search,
    browseRecords,
    getTaskStatus,
    manageRecords,
    manageIndices,
    indexSettings,
    manageSynonyms,
    manageRules,
    searchAnalytics,
    sendEvents,
    manageApiKeys,
    manageAbTests,
    getRecommendations,
    monitoring
  ],
  toolCategories: [
    toolCategory({
      key: 'search',
      name: 'Search and Indexing',
      description:
        'Search records and manage indices, records, settings, rules, synonyms, and API keys.',
      tools: [
        search,
        browseRecords,
        getTaskStatus,
        manageRecords,
        manageIndices,
        indexSettings,
        manageSynonyms,
        manageRules,
        manageApiKeys
      ]
    }),
    toolCategory({
      key: 'analytics',
      name: 'Analytics and Insights',
      description: 'Inspect search analytics and send user interaction events.',
      tools: [searchAnalytics, sendEvents]
    }),
    toolCategory({
      key: 'recommend',
      name: 'Recommend',
      description: 'Retrieve recommendations from trained recommendation models.',
      tools: [getRecommendations]
    }),
    toolCategory({
      key: 'monitoring',
      name: 'Monitoring',
      description: 'Inspect application servers, cluster health, and infrastructure metrics.',
      tools: [monitoring]
    }),
    toolCategory({
      key: 'ab_testing',
      name: 'A/B Testing',
      description: 'Create and manage tests comparing search index configurations.',
      tools: [manageAbTests]
    })
  ],
  triggers: []
});
