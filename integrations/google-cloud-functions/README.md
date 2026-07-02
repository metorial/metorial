# <img src="https://provider-logos.metorial-cdn.com/google.svg" height="20"> Google Cloud Functions

Manage serverless cloud functions on Google Cloud. Create, update, deploy, list, and delete functions triggered by HTTP requests or cloud events. Configure runtimes (Node.js, Python, Go, Java, .NET, Ruby), event triggers (Cloud Storage, Pub/Sub, Firestore), memory, timeouts, and environment variables. Upload and download function source code via signed URLs. Invoke deployed HTTP functions. Manage function upgrades from 1st gen to 2nd gen. List available runtimes and monitor long-running deployment operations. Configure ingress/egress networking, secret environment variables, and authentication settings for function invocation.

## Tools

### Create Function

Create and deploy a new Cloud Function. Configure the runtime, entry point, source code location, memory, timeout, environment variables, and event triggers. Source code must be uploaded to a Cloud Storage bucket or referenced from a Cloud Source Repository. Returns a long-running operation that can be polled for completion.

### Delete Function

Permanently delete a Cloud Function. This removes the function and all its associated resources. Returns a long-running operation that can be polled for completion.

### Generate Download URL

Generate a signed URL for downloading the source code of a deployed Cloud Function. The URL is time-limited and can be used to retrieve the function's source archive.

### Generate Upload URL

Generate a signed URL for uploading function source code to Cloud Storage. The returned URL and storage source should be used when creating or updating a function. Upload your source code archive (ZIP) to the signed URL before referencing it in a create or update call.

### Get Function

Retrieve full details of a specific Cloud Function including its build configuration, service configuration, event trigger settings, state, and deployment URL. Use a short function name or a fully qualified resource name.

### Get Operation

Check the status of a long-running operation such as function creation, update, or deletion. Provides the current state and any error or success details.

### List Functions

List Cloud Functions in a Google Cloud project. Returns a summary of each function including its state, runtime, URL, and labels. Supports filtering and pagination, and can query across all regions or a specific region.

### List Runtimes

List available runtime environments for Cloud Functions, including their lifecycle status (supported, deprecated, decommissioned). Useful for choosing a runtime when creating or updating functions.

### Manage IAM Policy

Get or set the IAM policy for a Cloud Function. Use this to control who can invoke the function or manage its configuration. To make a function publicly accessible, grant the **roles/run.invoker** role to **allUsers**.

### Update Function

Update an existing Cloud Function's configuration. Modify runtime settings, memory, timeout, environment variables, labels, description, scaling limits, ingress/egress settings, and more. Only the fields you provide will be updated. Returns a long-running operation.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
