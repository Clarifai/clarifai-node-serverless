import { Model } from "../../src/index";

const LLM_MODEL_URL =
  "https://clarifai.com/dani-cfg/pythonic-models/models/llm-dummy-test";

const CLARIFAI_PAT = process.env.CLARIFAI_PAT!;

const llmModelOutput = async () => {
  try {
    const llmModel = new Model({
      url: LLM_MODEL_URL,
      authConfig: {
        pat: CLARIFAI_PAT,
      },
    });

    const availableMethods = await llmModel.availableMethods();

    console.log(availableMethods);

    const response = await llmModel.predict({
      methodName: "predict",
      prompt: "Test Message",
    });

    const responseData = Model.getOutputDataFromModelResponse(response);

    console.log(responseData);
  } catch (e) {
    console.log(e);
    console.log(JSON.stringify(e.cause));
  }
};

llmModelOutput();
