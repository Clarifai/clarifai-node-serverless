import { Workflow, getInputFromUrl } from "../../src/index";

const GENERAL_WORKFLOW =
  "https://clarifai.com/dani-cfg/test-ocr-workflow/workflows/General";

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

workflow
  .predict({
    inputs: [input],
  })
  .then((response) => {
    console.log("Workflow prediction response:", response);
  })
  .catch((error) => {
    console.error("Error during workflow prediction:", error);
  });
