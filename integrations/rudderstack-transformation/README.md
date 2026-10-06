# RudderStack Transformations

Manage transformation code, reusable libraries and their revision history through RudderStack's management API. Discover published resources, inspect exact revisions, test requested versions, publish or roll back, and connect/disconnect published transformations and destinations.

Connect with a workspace Service Access Token (recommended), or a Personal Access Token with Read-Write role for testing/personal use. The Transformations API uses Bearer authentication. Select the US or EU management region. This API is separate from RudderStack's Basic-auth Test API, event ingestion and destination delivery APIs.

There are 17 tools, retaining all 13 original keys. New tools read transformation/library revisions, validate requested revisions, and manage destination associations. Published get/list operations may omit drafts; use revision tools to inspect unpublished updates. Version lists support count and creation-date ordering; no offset or cursor is documented.

Publishing makes code available to incoming traffic. Connecting replaces any transformation currently associated with that destination. Review code, imports, synthetic test inputs and existing associations before executing or deploying; code validation can run functions that access external services. Revision validation does not publish or connect code. Transformation stream processing and external event delivery are not proved by a successful management request.

Library description-only updates retain the latest revision's code and immutable language. Deleting a transformation/library removes its published resource, but RudderStack retains revision history. Use controlled test workspaces and explicitly authorize permanent test revisions before verification. No production resource is needed by the private test suite.
