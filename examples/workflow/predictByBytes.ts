import { Workflow } from "../../src";

async function fetchImageToBuffer(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

const GENERAL_WORKFLOW =
  "https://clarifai.com/dani-cfg/test-ocr-workflow/workflows/General";

const CELEBRITY_IMAGE = "https://samples.clarifai.com/celebrity.jpeg";

const workflow = new Workflow({
  url: GENERAL_WORKFLOW,
  authConfig: {
    pat: process.env.CLARIFAI_PAT!,
  },
});

fetchImageToBuffer(CELEBRITY_IMAGE)
  .then((inputBytes) => {
    workflow
      .predictByBytes({ inputBytes, inputType: "image" })
      .then((response) => {
        console.log("Workflow prediction response:", response);
      })
      .catch((error) => {
        console.error("Error during workflow prediction:", error);
      });
  })
  .catch(console.error);
