# <img src="https://provider-logos.metorial-cdn.com/cohere.png" height="20"> Cohere

Generate text and chat completions using Cohere's Command family of large language models, with support for multi-turn conversations, retrieval augmented generation (RAG), tool use, reasoning, vision, structured output, and translation. Create text and image embeddings for semantic search, classification, and clustering. Rerank search results by semantic relevance. Transcribe speech audio. Manage datasets and batch embedding jobs for large-scale document processing. Tokenize and detokenize text for cost estimation. List available models and inspect their capabilities.

## Tools

### Chat

Generate text responses using Cohere's Command family of models. Supports multi-turn conversations with system prompts, tool use for calling external APIs, and retrieval augmented generation (RAG) with inline citations. Can be configured for reasoning tasks with adjustable thinking budgets.

### Embed Content

Generate embeddings using Cohere's Embed models for text, image data URIs, or mixed text/image inputs. Returns vector representations that capture semantic meaning, useful for semantic search, classification, clustering, and similarity comparisons. Supports configurable dimensionality and multiple output formats.

### List Models

List available Cohere models with their capabilities. Filter by endpoint type (chat, embed, rerank, etc.) to find models compatible with a specific use case.

### Get Model

Retrieve detailed metadata for a Cohere model, including supported endpoints, context length, tokenizer URL, feature flags, and default sampling parameters.

### Create Dataset

Create a Cohere hosted dataset by uploading a CSV, JSONL, or text file. Embed-input datasets can be used later with batch embed jobs.

### List Datasets

List datasets stored in your Cohere account. Datasets are used for batch embedding jobs and can be filtered by type, date, and validation status.

### Get Dataset Usage

View total Cohere hosted dataset storage usage for the organization.

### Create Embed Job

Launch an asynchronous batch embedding job to embed a large dataset (100K+ documents). Results are stored as a new hosted dataset. Best suited for encoding large corpora for retrieval use cases.

### Rerank Documents

Rerank a list of documents by semantic relevance to a query using Cohere's Rerank models. Useful for improving search quality by re-ordering results from any existing search system based on meaning rather than keyword matching.

### Tokenize Text

Split text into tokens using byte-pair encoding (BPE) for a specific Cohere model. Useful for estimating costs, understanding how a model processes input, and checking token limits before making API calls.

### Transcribe Audio

Transcribe speech from an uploaded audio file using Cohere Transcribe.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
