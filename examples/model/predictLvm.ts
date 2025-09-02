import { Model } from "../../src/index";

const LVM_MODEL_URL =
  "https://clarifai.com/dani-cfg/pythonic-models/models/lvm-dummy-test";

const DOG_IMAGE_URL = "https://samples.clarifai.com/dog2.jpeg";

const CLARIFAI_PAT = process.env.CLARIFAI_PAT!;

const lvmModelOutput = async () => {
  const lvmModel = new Model({
    url: LVM_MODEL_URL,
    authConfig: {
      pat: CLARIFAI_PAT,
    },
  });

  const availableMethods = await lvmModel.availableMethods();

  console.log(availableMethods);

  const response = await lvmModel.predict({
    methodName: "generate",
    prompt: "Test Message",
    image: {
      url: DOG_IMAGE_URL,
    },
  });

  const responseData = Model.getOutputDataFromModelResponse(response);

  console.log(responseData);
};

lvmModelOutput();
