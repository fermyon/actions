# `fermyon/actions` - GitHub Action collection for Spin and Fermyon Cloud


With the `fermyon/actions` collection, you can incorporate [Spin](https://developer.fermyon.com/spin/index) and [Fermyon Cloud](https://developer.fermyon.com/cloud/index) in your [GitHub Action](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/configuring-a-workflow). 

This collection of Actions enables the following use cases:

- [x] set up Spin CLI and plugins using [`fermyon/actions/spin/setup@v1`](#install-spin-cli-and-plugins---fermyonactionsspinsetupv1)
- [x] build and push your Spin app to an OCI registry using [`fermyon/actions/spin/push@v1`](#push-spin-app-to-an-oci-registry---fermyonactionsspinpushv1)
- [x] deploy your Spin app to Fermyon Cloud using [`fermyon/actions/spin/deploy@v1`](#deploy-spin-app-to-fermyon-cloud---fermyonactionsspindeployv1)
- [x] deploy PR preview to Fermyon Cloud [`fermyon/action/spin/preview@v1`](#deploy-preview-of-spin-app-to-fermyon-cloud---fermyon/action/spin/preview@v1)


Let's take a look at each one to learn about the required inputs and walk through an example. 

## Install Spin CLI and Plugins - `fermyon/actions/spin/setup@v1`

setup `spin` with optional plugins

### Inputs

| Name         | Required | Default | Description                                                                                                                                   |
| ------------ | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| version      | False | latest       | The version of `spin` to install.                                         |
| plugins      | False | -       | The comma-separated list of Spin plugins to install. [Learn more about Spin plugins.](https://developer.fermyon.com/spin/managing-plugins)                                                                                         |
| github_token | False | -       | The GitHub token for querying/downloading `spin` releases. If provided, it avoids GitHub API rate limiting during GitHub actions executions |

### Examples

#### Setting up latest version of `spin` 

```yaml
name: spin

on:
  - push

jobs:
  spin:
    runs-on: ubuntu-latest
    name: Setup spin
    steps:
      - name: Setup `spin`
        uses: fermyon/actions/spin/setup@v1

      - name: Run `spin version`
        run: "spin --version"
```

#### Setting up a specific version of `spin` 

```yaml
name: spin

on:
  - push

jobs:
  spin:
    runs-on: ubuntu-latest
    name: Setup spin
    steps:
      - name: Setup `spin`
        uses: fermyon/actions/spin/setup@v1
        with:
          version: "v0.10.1"

      - name: Run `spin version`
        run: "spin --version"
```

#### Setting up `spin` along with additional plugins

```yaml
name: spin

on:
  - push

jobs:
  spin:
    runs-on: ubuntu-latest
    name: Setup spin
    steps:
      - name: Setup `spin`
        uses: fermyon/actions/spin/setup@v1
        with:
          version: "v0.10.1"
          plugins: js2wasm

      - name: Run `spin version`
        run: "spin --version"
```

## Push Spin app to a Registry - `fermyon/actions/spin/push`

Build and push the `spin` app to your desired OCI Registry (note that this registry must have a publicly accessible endpoint). Also note this action has a prerequisite on Spin already being installed. 

### Inputs

| Name               | Required |  Default   |Description                                                                |
| ------------------ | -------- | --------- | -------------------------------------------------------------------------- |
| registry_reference | True | -         | The registry and reference for to publish the app to e.g. ghcr.io/fermyon/cloud-start:v0.0.1 |
| manifest_file      | False | spin.toml | Path to `spin.toml`                                                        |
| registry           | False | -         | if provided, used to login to OCI Registry                                 |
| registry_username  | False | -         | if provided, used to login to OCI Registry                                 |
| registry_password  | False | -         | if provided, used to login to OCI Registry                                 |

### Example

```yaml
name: spin

on:
  - push

jobs:
  spin:
    runs-on: ubuntu-latest
    name: Build and push
    steps:
      - uses: actions/checkout@v3

      - name: Setup `spin`
        uses: fermyon/actions/spin/setup@v1
        with:
          version: "v0.10.1"
          plugins: js2wasm

      - name: Login to the Container registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: build and push
        uses: fermyon/actions/spin/push@v1
        with:
          manifest_file: example-app/spin.toml
          registry_reference: ghcr.io/fermyon/example-app:v0.0.1

```




## Deploy Spin app to Fermyon Cloud - `fermyon/actions/spin/deploy@v1`

Build and deploy the Spin app to Fermyon Cloud.

### Inputs

| Name          | Required | Default   | Description                                                                       |
| ------------- | -------- | --------- |  --------------------------------------------------------------------------------- |
| fermyon_token | True | -         | Fermyon Cloud Personal Access Token for deploying the `spin` app to Fermyon Cloud |
| manifest_file | False | spin.toml | Path to `spin.toml`. 

### Example


```yaml
name: spin

on:
  - push

jobs:
  spin:
    runs-on: ubuntu-latest
    name: Build and deploy
    steps:
      - uses: actions/checkout@v3

      - name: Setup `spin`
        uses: fermyon/actions/spin/setup@v1
        with:
          version: canary
          plugins: js2wasm

      - name: build and deploy
        uses: fermyon/actions/spin/deploy@v1
        with:
          manifest_file: example-app/spin.toml
          fermyon_token: ${{ secrets.FERMYON_CLOUD_TOKEN }}
```

## Deploy preview of Spin app to Fermyon Cloud - `fermyon/action/spin/preview@v1`

Build and deploy the `spin` app preview to Fermyon Cloud

### Inputs

| Name          | Required | Default   | Description                                                                       |
| ------------- | -------- |--------- | --------------------------------------------------------------------------------- |
| fermyon_token | True | -         | Fermyon Cloud Personal access token for deploying the `spin` app to Fermyon Cloud |
| manifest_file | False | spin.toml | Path to `spin.toml`. Used with the `build`/`deploy` command.                      |
| github_token  | True | -         | The `GitHub` token for updating comment on PR                                     |
| undeploy      | False | -         | If true, removes the preview deployment from Fermyon Cloud                        | 

### Example

```yaml
name: spin

on:
  pull_request:
    branches: ["main", "v*"]
    types: ['opened', 'synchronize', 'reopened', 'closed']

jobs:
  spin:
    runs-on: ubuntu-latest
    name: Build and deploy
    steps:
      - uses: actions/checkout@v3

      - name: Setup `spin`
        uses: fermyon/actions/spin/setup@v1
        with:
          version: canary
          plugins: js2wasm

      - name: build and deploy
        uses: fermyon/actions/spin/preview@v1
        with:
          manifest_file: example-app/spin.toml
          fermyon_token: ${{ secrets.FERMYON_CLOUD_TOKEN }}
          github_token: ${{ secrets.GITHUB_TOKEN }}
          undeploy: ${{ github.event.pull_request && github.event.action == 'closed' }}
```
