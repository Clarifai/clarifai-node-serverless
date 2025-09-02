import { promisify } from "node:util";
import struct_pb from "google-protobuf/google/protobuf/struct_pb.js";
import {
  Data,
  Model as GrpcModel,
  Input,
  MethodSignature,
  ModelVersion,
  Output,
  OutputConfig,
  OutputInfo,
  RunnerSelector,
  UserAppIDSet,
} from "./generated/proto/clarifai/api/resources";
import {
  GetModelRequest,
  MultiOutputResponse,
  PostModelOutputsRequest,
  SingleModelResponse,
} from "./generated/proto/clarifai/api/service";
import { AuthConfig, Subset } from "./types";
import { ClarifaiUrl, ClarifaiUrlHelper } from "./urls/helper";
import { getClient } from "./utils/client";
import { Metadata } from "@grpc/grpc-js";
import { getMetaData } from "./utils/getMetadata";
import { StatusCode } from "./generated/proto/clarifai/api/status/status_code";
import { validateMethodSignaturesList } from "./utils/validateMethodSignaturesList";
import { extractPayloadAndParams } from "./utils/extractPayloadAndParams";
import { constructPartsFromPayload } from "./utils/constructPartsFromPayload";
import { constructPartsFromParams } from "./utils/setPartsFromParams";
import { MAX_MODEL_PREDICT_INPUTS } from "./constants/model";
import { BackoffIterator } from "./utils/misc";
const { Struct } = struct_pb;

interface BaseModelConfig {
  modelVersion?: { id: string };
  runner?: Subset<RunnerSelector>;
}

interface ModelConfigWithUrl extends BaseModelConfig {
  url: ClarifaiUrl;
  modelId?: undefined;
  authConfig?: Omit<AuthConfig, "userId" | "appId">;
  modelUserAppId?: undefined;
}

interface ModelConfigWithModelId extends BaseModelConfig {
  url?: undefined;
  modelId: string;
  authConfig?: AuthConfig;
  modelUserAppId?: {
    userId: string;
    appId: string;
  };
}

type ModelConfig = ModelConfigWithUrl | ModelConfigWithModelId;

interface GeneralModelPredictConfig {
  inputs: Input[];
  inferenceParams?: Record<string, any>;
  outputConfig?: OutputConfig;
}

type TextModelPredictConfig = {
  methodName: string;
} & Record<string, unknown>;

type ModelPredictConfig = GeneralModelPredictConfig | TextModelPredictConfig;

const isTextModelPredictConfig = (
  config: ModelPredictConfig,
): config is TextModelPredictConfig => {
  return (
    typeof config === "object" &&
    config !== null &&
    // @ts-expect-error - methodName check needed for the type guard
    typeof config.methodName === "string"
  );
};

const isModelConfigWithUrl = (
  config: ModelConfig,
): config is ModelConfigWithUrl => {
  return (config as ModelConfigWithUrl).url !== undefined;
};

export class Model {
  private appId: string;
  private id: string;
  private modelUserAppId: UserAppIDSet | undefined;
  private modelVersion: { id: string } | undefined;
  public modelInfo: Partial<GrpcModel>;
  private runner: RunnerSelector | undefined;
  private authConfig: AuthConfig;
  private userAppId: UserAppIDSet;

  constructor(config: ModelConfig) {
    const { modelId, modelVersion, modelUserAppId } = config;
    if (config.url && config.modelId) {
      throw new Error("You can only specify one of url or model_id.");
    }
    if (config.url && modelUserAppId) {
      throw new Error("You can only specify one of url or modelUserAppId.");
    }
    if (!config.url && !config.modelId) {
      throw new Error("You must specify one of url or model_id.");
    }

    let _authConfig: AuthConfig,
      _destructuredModelId: string = "",
      _destructuredModelVersionId: string | undefined = undefined;
    if (isModelConfigWithUrl(config)) {
      const { url } = config;
      const [userId, appId] = ClarifaiUrlHelper.splitClarifaiUrl(url);
      [, , , _destructuredModelId, _destructuredModelVersionId] =
        ClarifaiUrlHelper.splitClarifaiUrl(url);
      this.modelUserAppId = {
        userId,
        appId,
      };
      _authConfig = config.authConfig
        ? {
            ...config.authConfig,
            userId,
            appId,
          }
        : {
            userId,
            appId,
            pat: process.env.CLARIFAI_PAT!,
          };
    } else {
      // if authconfig is undefined, we pick the values from env
      _authConfig = config.authConfig || {
        pat: process.env.CLARIFAI_PAT!,
        userId: process.env.CLARIFAI_USER_ID!,
        appId: process.env.CLARIFAI_APP_ID!,
      };
    }

    this.authConfig = _authConfig;
    this.userAppId = {
      appId: _authConfig.appId!,
      userId: _authConfig.userId!,
    };
    this.appId = _authConfig.appId;
    this.modelVersion =
      modelVersion ||
      (_destructuredModelVersionId
        ? { id: _destructuredModelVersionId }
        : undefined);
    this.id = modelId || _destructuredModelId;
    this.modelInfo = {};
    const grpcModelVersion: Partial<ModelVersion> = {};
    if (this.modelVersion) {
      grpcModelVersion.id = this.modelVersion.id;
    }
    this.modelInfo.appId = this.appId;
    this.modelInfo.id = this.id;
    if (this.modelVersion) {
      this.modelInfo.modelVersion = grpcModelVersion as ModelVersion;
    }
    if (modelUserAppId) this.modelUserAppId = modelUserAppId;
    if (config.runner) {
      this.setRunner(config.runner);
    }
  }

  /**
   * Sets the runner for the model.
   */
  setRunner(runner: Subset<RunnerSelector>): void {
    if (this.modelUserAppId?.userId) {
      if (runner.deployment) {
        if (!runner.deployment.userId) {
          runner = {
            ...runner,
            deployment: {
              ...runner.deployment,
              userId: this.modelUserAppId.userId,
            },
          };
        }
      } else {
        runner = {
          ...runner,
          deployment: {
            userId: this.modelUserAppId.userId,
          },
        };
      }
    }
    this.runner = RunnerSelector.fromPartial(runner as Partial<RunnerSelector>);
  }

  async availableMethods(): Promise<string[]> {
    if (!this.modelInfo.modelVersion?.methodSignatures) await this.loadInfo();

    const methodSignatures = this.modelInfo.modelVersion?.methodSignatures;

    if (!methodSignatures) {
      throw new Error(
        `Model ${this.id} is incompatible with the new interface`,
      );
    }

    return methodSignatures.map((each) => each.name);
  }

  static getOutputDataFromModelResponse(outputs: Output[]): Data | undefined {
    return outputs?.[0]?.data?.parts?.[0]?.data;
  }

  async methodSignatures(): Promise<MethodSignature[]> {
    if (!this.modelInfo.modelVersion?.methodSignatures) await this.loadInfo();

    const methodSignatures = this.modelInfo.modelVersion?.methodSignatures;

    if (!methodSignatures) {
      throw new Error(
        `Model ${this.id} is incompatible with the new interface`,
      );
    }

    return methodSignatures;
  }

  async predict(
    predictArgs: TextModelPredictConfig,
  ): Promise<MultiOutputResponse["outputs"]>;
  async predict({
    inputs,
    inferenceParams,
    outputConfig,
  }: GeneralModelPredictConfig): Promise<MultiOutputResponse["outputs"]>;
  async predict(
    config: ModelPredictConfig,
  ): Promise<MultiOutputResponse["outputs"]> {
    let request: PostModelOutputsRequest = {} as PostModelOutputsRequest;
    if (isTextModelPredictConfig(config)) {
      request = await this.constructRequestWithMethodSignature(request, config);
    } else {
      const { inputs, inferenceParams, outputConfig } = config;
      if (!Array.isArray(inputs)) {
        throw new Error(
          "Invalid inputs, inputs must be an array of Input objects.",
        );
      }
      if (inputs.length > MAX_MODEL_PREDICT_INPUTS) {
        throw new Error(`Too many inputs. Max is ${MAX_MODEL_PREDICT_INPUTS}.`);
      }

      this.overrideModelVersion({ inferenceParams, outputConfig });
      const requestInputs: Input[] = [];
      for (const input of inputs) {
        requestInputs.push(input);
      }

      if (this.modelUserAppId) {
        request.userAppId = this.modelUserAppId;
      } else {
        request.userAppId = this.userAppId;
      }
      request.modelId = this.id;
      if (this.modelVersion && this.modelVersion.id)
        request.versionId = this.modelVersion.id;
      request.inputs = requestInputs;
      request.model = this.modelInfo as GrpcModel;
    }
    if (this.runner) {
      request.runnerSelector = this.runner;
    }
    const startTime = Date.now();
    const backoffIterator = new BackoffIterator();

    const client = getClient(this.authConfig.base);

    const postModelOutputs = promisify<
      (
        request: PostModelOutputsRequest,
        meta: Metadata,
      ) => Promise<MultiOutputResponse>
      // @ts-expect-error - right overload is not picked up
    >(client.postModelOutputs.bind(client));

    const meta = getMetaData(this.authConfig.pat);

    const requestObject = PostModelOutputsRequest.fromPartial(request);

    return new Promise<MultiOutputResponse["outputs"]>((resolve, reject) => {
      const makeRequest = () => {
        postModelOutputs(requestObject, meta)
          .then((response) => {
            if (
              response.status?.code === StatusCode.MODEL_DEPLOYING &&
              Date.now() - startTime < 600000
            ) {
              console.log(
                `${this.id} model is still deploying, please wait...`,
              );
              setTimeout(makeRequest, backoffIterator.next().value * 1000);
            } else if (response.status?.code !== StatusCode.SUCCESS) {
              reject(
                new Error(
                  `Model Predict failed with response ${JSON.stringify(response.status)}`,
                  {
                    cause: response,
                  },
                ),
              );
            } else {
              resolve(response.outputs);
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

  async loadInfo() {
    const client = getClient(this.authConfig.base);

    const getModelResults = promisify<
      (request: GetModelRequest, meta: Metadata) => Promise<SingleModelResponse>
      // @ts-expect-error - right overload is not picked up
    >(client.getModel.bind(client));

    const request: Partial<GetModelRequest> = {};
    if (this.modelUserAppId) {
      request.userAppId = this.modelUserAppId;
    } else {
      request.userAppId = this.userAppId;
    }
    request.modelId = this.id;
    if (this.modelVersion?.id) request.versionId = this.modelVersion.id;

    const meta = getMetaData(this.authConfig.pat);

    const getModelRequest = GetModelRequest.fromPartial(request);
    const responseObject = await getModelResults(getModelRequest, meta);

    if (responseObject.status?.code !== StatusCode.SUCCESS) {
      throw new Error(
        `Failed to get model: ${responseObject.status?.code} : ${responseObject.status?.description}`,
        {
          cause: responseObject,
        },
      );
    }

    this.modelInfo = {};
    if (responseObject.model?.id) {
      this.modelInfo.id = responseObject.model?.id;
    }
    if (responseObject.model?.appId) {
      this.modelInfo.appId = responseObject.model?.appId;
    }
    if (responseObject.model?.userId) {
      this.modelInfo.userId = responseObject.model?.userId;
    }
    const grpcModelVersion: Partial<ModelVersion> = {};
    if (responseObject.model?.modelVersion?.id) {
      grpcModelVersion.id = responseObject.model?.modelVersion?.id;
    }
    this.modelInfo.modelVersion = grpcModelVersion as ModelVersion;
    if (this.modelInfo && this.modelInfo.modelVersion)
      this.modelInfo.modelVersion.methodSignatures = responseObject.model
        ?.modelVersion?.methodSignatures as MethodSignature[];
  }

  private async constructRequestWithMethodSignature(
    request: PostModelOutputsRequest,
    config: TextModelPredictConfig,
  ): Promise<PostModelOutputsRequest> {
    if (!this.modelInfo.modelVersion?.methodSignatures) {
      await this.loadInfo();
    }

    const { methodName, ...otherParams } = config;

    const modelInfoObject = this.modelInfo;

    const methodSignatures = modelInfoObject?.modelVersion?.methodSignatures;

    if (!methodSignatures) {
      throw new Error(
        `Model ${this.id} is incompatible with the new interface`,
      );
    }

    const targetMethodSignature = methodSignatures.find((each) => {
      return each.name === methodName;
    });

    if (!targetMethodSignature) {
      throw new Error(
        `Invalid Method: ${methodName}, available methods are ${methodSignatures.map((each) => each.name).join(", ")}`,
      );
    }

    validateMethodSignaturesList(
      otherParams,
      targetMethodSignature?.inputFields ?? [],
    );

    const { params, payload } = extractPayloadAndParams(
      otherParams,
      targetMethodSignature.inputFields,
    );

    const payloadPart = constructPartsFromPayload(
      payload as Record<string, any>,
      targetMethodSignature.inputFields.filter((each) => !each.isParam),
    );

    const paramsPart = constructPartsFromParams(
      params as Record<string, any>,
      targetMethodSignature.inputFields.filter((each) => each.isParam),
    );

    if (this.modelUserAppId) {
      request.userAppId = this.modelUserAppId;
    } else {
      request.userAppId = this.userAppId;
    }
    request.modelId = this.id;
    if (this.modelVersion && this.modelVersion.id)
      request.versionId = this.modelVersion.id;
    const input: Input = {} as Input;
    const requestData: Data = {} as Data;
    requestData.parts = [...payloadPart, ...paramsPart];
    input.data = requestData;
    request.inputs = [input];

    return request;
  }

  private overrideModelVersion({
    inferenceParams,
    outputConfig,
  }: {
    inferenceParams?: Record<string, any>;
    outputConfig?: OutputConfig;
  }): void {
    let currentModelVersion = this.modelInfo.modelVersion;
    if (!currentModelVersion) {
      currentModelVersion = {} as ModelVersion;
    }
    let currentOutputInfo = currentModelVersion.outputInfo;
    if (!currentOutputInfo) {
      currentOutputInfo = {} as OutputInfo;
    }
    if (outputConfig) {
      currentOutputInfo.outputConfig = outputConfig;
      const newOutputInfo = currentOutputInfo;
      currentModelVersion.outputInfo = newOutputInfo;
      this.modelInfo.modelVersion = currentModelVersion;
    }
    const updatedModelVersion = this.modelInfo.modelVersion;
    const updatedOutputInfo = updatedModelVersion?.outputInfo;
    if (updatedOutputInfo && inferenceParams) {
      const params = Struct.fromJavaScript(inferenceParams);
      updatedOutputInfo.params = params;
      if (updatedModelVersion.outputInfo) {
        updatedModelVersion.outputInfo = updatedOutputInfo;
      }
      this.modelInfo.modelVersion = updatedModelVersion;
    }
  }
}
