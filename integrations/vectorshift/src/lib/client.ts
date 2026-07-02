import { createAxios } from 'slates';

let BASE_URL = 'https://api.vectorshift.ai/v1';

export let createApiClient = (token: string) => {
  return createAxios({
    baseURL: BASE_URL,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
};

type ApiClient = ReturnType<typeof createApiClient>;

// Pipelines

export let listPipelines = async (
  api: ApiClient,
  params?: {
    includeShared?: boolean;
    verbose?: boolean;
  }
) => {
  let response = await api.get('/pipelines', {
    params: {
      include_shared: params?.includeShared ?? false,
      verbose: params?.verbose ?? false
    }
  });
  return response.data;
};

export let fetchPipeline = async (
  api: ApiClient,
  params: {
    pipelineId?: string;
    name?: string;
    username?: string;
    orgName?: string;
  }
) => {
  let response = await api.get('/pipeline', {
    params: {
      id: params.pipelineId,
      name: params.name,
      username: params.username,
      org_name: params.orgName
    }
  });
  return response.data;
};

export let createPipeline = async (
  api: ApiClient,
  data: {
    name: string;
    description?: string;
    config: Record<string, unknown>;
  }
) => {
  let response = await api.post('/pipeline', data);
  return response.data;
};

export let deletePipeline = async (api: ApiClient, pipelineId: string) => {
  let response = await api.delete(`/pipeline/${pipelineId}`);
  return response.data;
};

export let runPipeline = async (
  api: ApiClient,
  pipelineId: string,
  data: {
    inputs: Record<string, unknown>;
    conversationId?: string;
  }
) => {
  let body: Record<string, unknown> = { inputs: data.inputs };
  if (data.conversationId) {
    body.conversation_id = data.conversationId;
  }
  let response = await api.post(`/pipeline/${pipelineId}/run`, body);
  return response.data;
};

export let bulkRunPipeline = async (
  api: ApiClient,
  pipelineId: string,
  runs: Array<{
    inputs: Record<string, unknown>;
    conversationId?: string;
  }>
) => {
  let response = await api.post(`/pipeline/${pipelineId}/bulk_run`, {
    runs: runs.map(r => ({
      inputs: r.inputs,
      ...(r.conversationId ? { conversation_id: r.conversationId } : {})
    }))
  });
  return response.data;
};

export let terminatePipelineRun = async (
  api: ApiClient,
  pipelineId: string,
  runId: string
) => {
  let response = await api.post(`/pipeline/${pipelineId}/terminate`, {
    run_id: runId
  });
  return response.data;
};

export let pausePipelineRun = async (api: ApiClient, pipelineId: string, runId: string) => {
  let response = await api.post(`/pipeline/${pipelineId}/pause`, {
    run_id: runId
  });
  return response.data;
};

export let resumePipelineRun = async (
  api: ApiClient,
  pipelineId: string,
  runIds: string[]
) => {
  let response = await api.post(`/pipeline/${pipelineId}/resume`, {
    run_ids: runIds
  });
  return response.data;
};

// Knowledge Bases

export let listKnowledgeBases = async (
  api: ApiClient,
  params?: {
    includeShared?: boolean;
    verbose?: boolean;
  }
) => {
  let response = await api.get('/knowledge-bases', {
    params: {
      include_shared: params?.includeShared ?? false,
      verbose: params?.verbose ?? false
    }
  });
  return response.data;
};

export let fetchKnowledgeBase = async (
  api: ApiClient,
  params: {
    knowledgeBaseId?: string;
    name?: string;
    username?: string;
    orgName?: string;
  }
) => {
  let response = await api.get('/knowledge-base', {
    params: {
      id: params.knowledgeBaseId,
      name: params.name,
      username: params.username,
      org_name: params.orgName
    }
  });
  return response.data;
};

export let createKnowledgeBase = async (
  api: ApiClient,
  data: {
    name: string;
    description?: string;
    fileProcessingImplementation?: string;
    chunkSize?: number;
    chunkOverlap?: number;
    analyzeDocuments?: boolean;
  }
) => {
  let response = await api.post('/knowledge-base', {
    name: data.name,
    description: data.description,
    file_processing_implementation: data.fileProcessingImplementation,
    chunk_size: data.chunkSize,
    chunk_overlap: data.chunkOverlap,
    analyze_documents: data.analyzeDocuments
  });
  return response.data;
};

export let deleteKnowledgeBase = async (api: ApiClient, knowledgeBaseId: string) => {
  let response = await api.delete(`/knowledge-base/${knowledgeBaseId}`);
  return response.data;
};

export let addUrlToKnowledgeBase = async (
  api: ApiClient,
  knowledgeBaseId: string,
  data: {
    url: string;
    recursive?: boolean;
    returnType?: string;
    urlLimit?: number;
    rescrapeFrequency?: string;
  }
) => {
  let response = await api.post(`/knowledge-base/${knowledgeBaseId}/index`, {
    request: {
      url: data.url,
      recursive: data.recursive ?? false,
      return_type: data.returnType ?? 'CHUNKS',
      url_limit: data.urlLimit
    },
    rescrape_frequency: data.rescrapeFrequency ?? 'never'
  });
  return response.data;
};

export let addTextToKnowledgeBase = async (
  api: ApiClient,
  knowledgeBaseId: string,
  data: {
    text: string;
    fileName?: string;
  }
) => {
  let base64Content = Buffer.from(data.text).toString('base64');
  let response = await api.post(`/knowledge-base/${knowledgeBaseId}/index`, {
    file: {
      type: 'file',
      raw_bytes: base64Content,
      metadata: {
        name: data.fileName ?? 'text-document.txt',
        mime_type: 'text/plain'
      }
    }
  });
  return response.data;
};

export let queryKnowledgeBase = async (
  api: ApiClient,
  knowledgeBaseId: string,
  data: {
    queries: string[];
    context?: string;
    topK?: number;
    rerankDocuments?: boolean;
    transformQuery?: boolean;
  }
) => {
  let body: Record<string, unknown> = {
    queries: data.queries
  };
  if (data.context) {
    body.context = data.context;
  }
  if (data.topK !== undefined) {
    body.search_metadata = { top_k: data.topK };
  }
  if (data.rerankDocuments !== undefined || data.transformQuery !== undefined) {
    body.config = {
      ...(data.rerankDocuments !== undefined
        ? { rerank_documents: data.rerankDocuments }
        : {}),
      ...(data.transformQuery !== undefined ? { transform_query: data.transformQuery } : {})
    };
  }
  let response = await api.post(`/knowledge-base/${knowledgeBaseId}/query`, body);
  return response.data;
};

export let listDocuments = async (
  api: ApiClient,
  knowledgeBaseId: string,
  params?: {
    title?: string;
    integrationId?: string;
    folderId?: string;
  }
) => {
  let response = await api.get(`/knowledge-base/${knowledgeBaseId}/documents`, {
    params: {
      title: params?.title,
      integration_id: params?.integrationId,
      folder_id: params?.folderId
    }
  });
  return response.data;
};

export let deleteDocuments = async (
  api: ApiClient,
  knowledgeBaseId: string,
  documentIds: string[]
) => {
  let response = await api.delete(`/knowledge-base/${knowledgeBaseId}/documents`, {
    params: {
      document_ids: documentIds.join(',')
    }
  });
  return response.data;
};

// Chatbots

export let listChatbots = async (
  api: ApiClient,
  params?: {
    includeShared?: boolean;
    verbose?: boolean;
  }
) => {
  let response = await api.get('/chatbots', {
    params: {
      include_shared: params?.includeShared ?? false,
      verbose: params?.verbose ?? false
    }
  });
  return response.data;
};

export let fetchChatbot = async (
  api: ApiClient,
  params: {
    chatbotId?: string;
    name?: string;
    username?: string;
    orgName?: string;
  }
) => {
  let response = await api.get('/chatbot', {
    params: {
      id: params.chatbotId,
      name: params.name,
      username: params.username,
      org_name: params.orgName
    }
  });
  return response.data;
};

export let createChatbot = async (
  api: ApiClient,
  data: {
    name: string;
    description: string;
    pipelineId: string;
    pipelineVersion?: string;
    input?: string;
    output?: string;
    deployed?: boolean;
  }
) => {
  let response = await api.post('/chatbot', {
    name: data.name,
    description: data.description,
    pipeline: {
      id: data.pipelineId,
      version: data.pipelineVersion ?? 'latest'
    },
    input: data.input,
    output: data.output,
    deployed: data.deployed
  });
  return response.data;
};

export let deleteChatbot = async (api: ApiClient, chatbotId: string) => {
  let response = await api.delete(`/chatbot/${chatbotId}`);
  return response.data;
};

export let runChatbot = async (
  api: ApiClient,
  chatbotId: string,
  data: {
    text: string;
    conversationId?: string;
  }
) => {
  let body: Record<string, unknown> = {
    text: data.text,
    stream: false
  };
  if (data.conversationId) {
    body.conversation_id = data.conversationId;
  }
  let response = await api.post(`/chatbot/${chatbotId}/run`, body);
  return response.data;
};

export let terminateChatbotSession = async (
  api: ApiClient,
  chatbotId: string,
  pipelineRunId: string
) => {
  let response = await api.post(`/chatbot/${chatbotId}/terminate`, {
    pipeline_run_id: pipelineRunId
  });
  return response.data;
};

// Transformations

export let listTransformations = async (
  api: ApiClient,
  params?: {
    includeShared?: boolean;
    verbose?: boolean;
  }
) => {
  let response = await api.get('/transformations', {
    params: {
      include_shared: params?.includeShared ?? false,
      verbose: params?.verbose ?? false
    }
  });
  return response.data;
};

export let fetchTransformation = async (
  api: ApiClient,
  params: {
    transformationId?: string;
    name?: string;
    username?: string;
    orgName?: string;
  }
) => {
  let response = await api.get('/transformation', {
    params: {
      id: params.transformationId,
      name: params.name,
      username: params.username,
      org_name: params.orgName
    }
  });
  return response.data;
};

export let createTransformation = async (
  api: ApiClient,
  data: {
    name: string;
    description: string;
    functionName: string;
    functionCode: string;
    inputSchema: Record<string, unknown>;
    outputSchema: Record<string, unknown>;
  }
) => {
  let response = await api.post('/transformation', {
    name: data.name,
    description: data.description,
    function_name: data.functionName,
    function: data.functionCode,
    input_schema: data.inputSchema,
    output_schema: data.outputSchema
  });
  return response.data;
};

export let deleteTransformation = async (api: ApiClient, transformationId: string) => {
  let response = await api.delete(`/transformation/${transformationId}`);
  return response.data;
};

export let runTransformation = async (
  api: ApiClient,
  transformationId: string,
  inputs: Record<string, unknown>
) => {
  let response = await api.post(`/transformation/${transformationId}/run`, {
    inputs
  });
  return response.data;
};
