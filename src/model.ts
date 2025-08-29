import {
  Model as GrpcModel,
  ModelVersion,
  RunnerSelector,
  UserAppIDSet,
} from "./generated/proto/clarifai/api/resources";
import { AuthConfig, Subset } from "./types";
import { ClarifaiUrl, ClarifaiUrlHelper } from "./urls/helper";

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

const isModelConfigWithUrl = (
  config: ModelConfig,
): config is ModelConfigWithUrl => {
  return (config as ModelConfigWithUrl).url !== undefined;
};

export class Models {
  private appId: string;
  private id: string;
  private modelUserAppId: UserAppIDSet | undefined;
  private modelVersion: { id: string } | undefined;
  public modelInfo: Partial<GrpcModel>;
  private trainingParams: Record<string, unknown>;
  private runner: RunnerSelector | undefined;
  private authConfig: AuthConfig;

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
    this.trainingParams = {};
    this.modelUserAppId = {
      appId: _authConfig.appId,
      userId: _authConfig.userId,
    };
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
}
