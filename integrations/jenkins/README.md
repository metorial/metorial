# <img src="https://provider-logos.metorial-cdn.com/jenkins.png" height="20"> Jenkins

Manage CI/CD pipelines and automation on a Jenkins server. Create, configure, enable, disable, and delete jobs (freestyle, pipeline, multibranch). Trigger builds with or without parameters, stop running builds, and retrieve build status, console output, artifacts, and test results. Manage build queues, views, folders, nodes (agents), plugins, and credentials. Retrieve system information and execute Groovy scripts. Configure webhooks to trigger builds from external systems or send build event notifications to external endpoints.

## Tools

### Execute Groovy Script

Execute a Groovy script on the Jenkins master or on a specific node. Returns the script output. Useful for advanced administration tasks, diagnostics, and custom automation.

### Get Build

Retrieve detailed information about a specific build or the last build of a Jenkins job. Includes build status, duration, timestamp, and optionally the console output and test results.

### Get Job Config

Retrieve the raw XML configuration of a Jenkins job. Useful for inspecting the full job configuration, cloning job settings, or preparing configuration updates.

### Get Job Details

Retrieve detailed information about a specific Jenkins job including its configuration, last build status, health reports, and recent builds. Supports jobs inside folders using slash-separated paths.

### Get System Info

Retrieve Jenkins server information including mode, description, number of executors, and the authenticated user's identity.

### List Builds

List recent builds for a Jenkins job. Returns build numbers, results, timestamps, and durations for the most recent builds.

### List Jobs

List jobs available on the Jenkins server. Supports filtering by name and listing jobs within a specific folder. Returns job names, URLs, status colors, and whether each job is buildable.

### Manage Credentials

List, get, create, update, or delete credentials stored in Jenkins. Credentials are used in jobs and pipelines for authenticating with external services. Supports scoping credentials to specific domains and folders.

### Manage Folder

Create or delete Jenkins folders for organizing jobs. Folders can be nested inside other folders.

### Manage Job

Create, copy, enable, disable, delete, or update the configuration of a Jenkins job. For **create** and **update**, provide the job's XML configuration. For **copy**, specify the source job name and new job name. For **enable**, **disable**, and **delete**, only the job path is required.

### Manage Node

List, get, create, delete, or toggle online/offline status of Jenkins nodes (agents). Nodes are the machines on which build agents run. Jenkins monitors each node for disk space, free temp space, free swap, clock time/sync, and response time.

### Manage Plugins

List installed Jenkins plugins or install new plugins. Returns plugin names, versions, enabled/active status, and dependency information.

### Manage Build Queue

List items in the Jenkins build queue or cancel a queued build. Use **list** to see all pending builds and their reasons, or **cancel** to remove a specific item from the queue.

### Manage View

Create, delete, or update Jenkins views and manage which jobs are displayed in them. Use **list** to list all views, **get** to get details of a specific view, **create** to create a new view, **delete** to remove a view, **add_job** to add a job to a view, or **remove_job** to remove a job from a view.

### Stop Build

Stop, terminate, or kill a running Jenkins build. Use **stop** for a graceful stop, **terminate** for a harder stop, or **kill** to forcefully end the build process.

### Trigger Build

Trigger a new build for a Jenkins job. Supports parameterized builds by passing key-value parameters. Returns the queue URL for the triggered build which can be used to track build progress.

## License

This integration is licensed under the [FSL-1.1](https://github.com/metorial/metorial-platform/blob/dev/LICENSE).

<div align="center">
  <sub>Built with ❤️ by <a href="https://metorial.com">Metorial</a></sub>
</div>
