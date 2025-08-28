![image](https://github.com/user-attachments/assets/3721189c-01c0-4936-a73c-13dcbf808542)

<h2 align="center">Clarifai Node.js SDK - For Serverless Environments</h2>

[![npm](https://img.shields.io/npm/v/clarifai-node-serverless)](https://www.npmjs.com/package/clarifai-node-serverless)
[![Build](https://github.com/Clarifai/clarifai-node-serverless/actions/workflows/build.yml/badge.svg)](https://github.com/Clarifai/clarifai-node-serverless/actions/workflows/build.yml)
[![Discord](https://img.shields.io/discord/1145701543228735582)](https://discord.com/invite/26upV8Y4Nd)

# Clarifai Node.js SDK - For Serverless Environments

This is the official Node.js client library for working with Clarifai's API in serverless environments. This library is designed to be lightweight, compatible with modern ESM syntax, and optimized for serverless platforms like AWS Lambda, Vercel, and Netlify.

> This library currently includes only a small subset of features from the main [Clarifai Node.js SDK](https://www.npmjs.com/package/clarifai-nodejs) package. We are actively working on adding more features and improvements. If you need a specific feature, please let us know by opening an issue or joining our [Discord community](https://discord.com/invite/26upV8Y4Nd).

[Website](https://www.clarifai.com/) | [Schedule Demo](https://www.clarifai.com/company/schedule-demo) | [Signup for a Free Account](https://clarifai.com/signup) | [API Docs](https://docs.clarifai.com/) | [Clarifai Community](https://clarifai.com/explore) | [Discord](https://discord.gg/XAPE3Vtg)

Give the repo a star ⭐

## Installation

```sh
npm install clarifai-node-serverless
```

## Usage

Clarifai uses **Personal Access Tokens(PATs)** to validate requests. You can create and manage PATs under your Clarifai account security settings.

* 🔗 [Create PAT:](https://docs.clarifai.com/clarifai-basics/authentication/personal-access-tokens/) ***Log into Portal &rarr; Profile Icon &rarr; Security Settings &rarr; Create Personal Access Token &rarr; Set the scopes &rarr; Confirm***

Export your PAT as an environment variable. Then, import and initialize the API Client.

Set PAT as environment variable through terminal:

```cmd
export CLARIFAI_PAT={your personal access token}
```

or use [dotenv](https://www.npmjs.com/package/dotenv) to load environment variables via a `.env` file

### Using Workflows

```typescript
import { Workflow, getInputFromUrl } from "clarifai-node-serverless";

const GENERAL_WORKFLOW =
  "https://clarifai.com/my-org/celebrity-check/workflows/General";

const CELEBRITY_IMAGE = "https://samples.clarifai.com/celebrity.jpeg";

const workflow = new Workflow({
  url: GENERAL_WORKFLOW,
  authConfig: {
    pat: process.env.CLARIFAI_PAT!,
  },
});

const input = getInputFromUrl({
  url: CELEBRITY_IMAGE,
  inputType: "image",
});

const response = await workflow.predict({
  inputs: [input],
});

console.log(response);
```
