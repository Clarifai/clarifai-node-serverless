import { Metadata } from "@grpc/grpc-js";
import { MAX_WORKFLOW_PREDICT_INPUTS } from "./constants/workflow";
import {
  Input as GrpcInput,
  WorkflowState,
} from "./generated/proto/clarifai/api/resources";
import { promisify } from "node:util";
import {
  PostWorkflowResultsRequest,
  PostWorkflowResultsResponse,
} from "./generated/proto/clarifai/api/service";
import { AuthConfig } from "./types";
import { ClarifaiUrl, ClarifaiUrlHelper } from "./urls/helper";
import { getMetaData } from "./utils/getMetadata";
import { StatusCode } from "./generated/proto/clarifai/api/status/status_code";
import { BackoffIterator } from "./utils/misc";
import { getInputFromBytes, getInputFromUrl } from "./input";
import { getClient } from "./utils/client";

type Input = GrpcInput;

type OutputConfig = { minValue: number };

type WorkflowConfig =
  | {
      url: ClarifaiUrl;
      workflowId?: undefined;
      workflowVersion?: undefined;
      outputConfig?: OutputConfig;
      authConfig?: Omit<AuthConfig, "userId" | "appId"> & {
        appId?: undefined;
        userId?: undefined;
      };
    }
  | {
      url?: undefined;
      workflowId: string;
      workflowVersion?: { id: string };
      outputConfig?: OutputConfig;
      authConfig?: AuthConfig;
    };

export class Workflow {
  private versionId: string;
  public id: string;
  public appId: string;
  private outputConfig: OutputConfig;
  private authConfig: AuthConfig;

  constructor({
    url,
    workflowId,
    workflowVersion = { id: "" },
    outputConfig = { minValue: 0 },
    authConfig = {},
  }: WorkflowConfig) {
    if (url && workflowId) {
      throw new Error("You can only specify one of url or workflow_id.");
    }
    if (!url && !workflowId) {
      throw new Error("You must specify one of url or workflow_id.");
    }
    if (url) {
      const [userId, appId, , _workflowId, workflowVersionId] =
        ClarifaiUrlHelper.splitClarifaiUrl(url);
      if (workflowVersionId) workflowVersion.id = workflowVersionId;
      authConfig.userId = userId;
      authConfig.appId = appId;
      workflowId = _workflowId;
    }

    this.id = workflowId || "";
    this.versionId = workflowVersion.id;
    this.outputConfig = outputConfig;
    this.appId = authConfig.appId || process.env.CLARIFAI_APP_ID!;
    this.authConfig = authConfig as AuthConfig; // missing userId and appId will be set in above logic
  }

  async predict({
    inputs,
    workflowStateId,
  }: {
    inputs: Input[];
    workflowStateId?: WorkflowState["id"];
  }): Promise<PostWorkflowResultsResponse> {
    if (inputs.length > MAX_WORKFLOW_PREDICT_INPUTS) {
      throw new Error(
        `Too many inputs. Max is ${MAX_WORKFLOW_PREDICT_INPUTS}.`,
      );
    }

    const request = PostWorkflowResultsRequest.fromPartial({
      userAppId: {
        userId: this.authConfig.userId!,
        appId: this.authConfig.appId!,
      },
      workflowId: this.id,
      versionId: this.versionId,
      inputs,
      outputConfig: this.outputConfig,
      workflowState: workflowStateId
        ? {
            id: workflowStateId,
          }
        : undefined,
    });

    const client = getClient(this.authConfig.base);

    const postWorkflowResults = promisify<
      (
        request: PostWorkflowResultsRequest,
        meta: Metadata,
      ) => Promise<PostWorkflowResultsResponse>
      // @ts-expect-error - right overload is not picked up
    >(client.postWorkflowResults.bind(client));

    const meta = getMetaData(this.authConfig.pat);

    const startTime = Date.now();
    const backoffIterator = new BackoffIterator();

    return new Promise((resolve, reject) => {
      const makeRequest = () => {
        postWorkflowResults(request, meta)
          .then((response) => {
            if (
              response.status?.code === StatusCode.MODEL_DEPLOYING &&
              Date.now() - startTime < 600000
            ) {
              console.log(
                `${this.id} Workflow is still deploying, please wait...`,
              );
              setTimeout(makeRequest, backoffIterator.next().value * 1000);
            } else if (response.status?.code !== StatusCode.SUCCESS) {
              reject(
                new Error(
                  `Workflow Predict failed with response ${response.status?.description}`,
                  {
                    cause: response,
                  },
                ),
              );
            } else {
              resolve(response);
            }
          })
          .catch((error) => {
            reject(
              new Error(`Model Predict failed with error: ${error.message}`, {
                cause: error.cause,
              }),
            );
          });
      };

      makeRequest();
    });
  }

  async predictByBytes({
    inputBytes,
    inputType,
    workflowStateId,
  }: {
    inputBytes: Buffer;
    inputType: "image" | "text" | "video" | "audio";
    workflowStateId?: WorkflowState["id"];
  }): Promise<PostWorkflowResultsResponse> {
    if (!["image", "text", "video", "audio"].includes(inputType)) {
      throw new Error(
        "Invalid input type. It should be image, text, video, or audio.",
      );
    }
    if (!Buffer.isBuffer(inputBytes)) {
      throw new Error("Invalid bytes.");
    }

    const input: Input = getInputFromBytes({
      inputBytes,
      inputType,
    });

    return this.predict({ inputs: [input], workflowStateId });
  }

  async predictByUrl({
    url,
    inputType,
    workflowStateId,
  }: {
    url: string;
    inputType: "image" | "text" | "video" | "audio";
    workflowStateId?: WorkflowState["id"];
  }): Promise<PostWorkflowResultsResponse> {
    if (!["image", "text", "video", "audio"].includes(inputType)) {
      throw new Error(
        "Invalid input type. It should be image, text, video, or audio.",
      );
    }

    const input = getInputFromUrl({
      url,
      inputType,
    });

    return this.predict({ inputs: [input], workflowStateId });
  }
}
