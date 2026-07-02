import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pinecone',
  name: 'Pinecone',
  description:
    'A fully managed, cloud-native vector database for storing, querying, and managing high-dimensional vector embeddings. Provides long-term memory for high-performance AI applications with semantic search, lexical search, RAG-based assistants, and integrated inference for embeddings and reranking.',
  metadata: {},
  config,
  auth
});
