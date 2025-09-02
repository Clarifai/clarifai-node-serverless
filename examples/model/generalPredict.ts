import { Model, getInputFromUrl } from "../../src/index";

const CLARIFAI_PAT = process.env.CLARIFAI_PAT!;
const MAIN_APP_ID = "main";
const MAIN_APP_USER_ID = "clarifai";
const GENERAL_MODEL_ID = "aaa03c23b3724a16a56b629203edc62c";

const generalPredict = async () => {
  try {
    const model = new Model({
      authConfig: {
        pat: CLARIFAI_PAT,
        userId: MAIN_APP_USER_ID,
        appId: MAIN_APP_ID,
      },
      modelId: GENERAL_MODEL_ID,
    });

    const input = getInputFromUrl({
      url: "https://samples.clarifai.com/metro-north.jpg",
      inputType: "image",
    });

    const prediction = await model.predict({
      inputs: [input],
    });

    console.log(prediction);
  } catch (e) {
    console.log(e);
    console.log(JSON.stringify(e.cause));
  }
};

generalPredict();
