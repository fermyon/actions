# `fermyon/actions` - GitHub Action collection for Spin and Fermyon Cloud

With the `fermyon/actions` collection, you can incorporate [Spin](https://developer.fermyon.com/spin/index) and [Fermyon Cloud](https://developer.fermyon.com/cloud/index) in your [GitHub Action](https://help.github.com/en/actions/automating-your-workflow-with-github-actions/configuring-a-workflow). 

This collection of Actions enables the following use cases:

- [x] setup Spin CLI and plugins using [`fermyon/actions/spin/setup`](#install-spin-cli-and-plugins---fermyonactionspinsetup)
- [x] build and push your Spin app to an OCI registry using [`fermyon/actions/spin/push`](#push-spin-app-to-an-oci-registry---fermyonactionspinpush)
- [x] deploy your Spin app to Fermyon Cloud using [`fermyon/actions/spin/deploy`](#deploy-spin-app-to-fermyon-cloud---fermyonactionspindeploy)

Let's take a look at each one to learn about the required inputs and walk through an example. 

## Install Spin CLI and Plugins - `fermyon/action/spin/setup`

setup `spin` with optional plugins

### Inputs

| Name         | Required | Default | Description                                                                                                                                   |
| ------------ | -------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| version      | False | latest       | The version of `spin` to install. Supports [semver](https://www.npmjs.com/package/semver) versioning                                          |
| plugins      | False | -       | The comma-separated list of `spin plugins` to install. You can learn more about Spin plugins [here](https://github.com/fermyon/spin-plugins)                                                                                         |
| github_token | False | -       | The `GitHub` token for querying/downloading `spin` releases. If provided, it avoids Github api rate limiting during Github actions executions |

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

## Push Spin app to an OCI Registry - `fermyon/action/spin/push`

Build and push the `spin` app to your desired OCI Registry (note that this registry must have a publicly accessible endpoint)

### Inputs

| Name               | Required |  Default   |Description                                                                |
| ------------------ | -------- | --------- | -------------------------------------------------------------------------- |
| registry_reference | True | -         | Push the spin app to your desired OCI Registry. e.g. ghcr.io/fermyon/cloud-start:v0.0.1 |
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




## Deploy Spin app to Fermyon Cloud - `fermyon/action/spin/deploy`

Build and deploy the `spin` app to Fermyon Cloud.

### Inputs

| Name          | Required | Default   | Description                                                                       |
| ------------- | -------- | --------- |  --------------------------------------------------------------------------------- |
| fermyon_token | True | -         | Fermyon Cloud Personal access token for deploying the `spin` app to Fermyon Cloud |
| manifest_file | False | spin.toml | Path to `spin.toml`. Used with the `build`/`deploy` command.                      |

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
