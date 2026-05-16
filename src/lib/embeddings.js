import { pipeline, env } from "@xenova/transformers";

env.allowLocalModels = false;
let extractorPromise = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = pipeline(
      "image-feature-extraction",
      "Xenova/clip-vit-base-patch32"
    );
  }
  return extractorPromise;
}

export async function getImageEmbedding(imageBlob) {
  try {
    const extractor = await getExtractor();
    const url = URL.createObjectURL(imageBlob);

    const output = await extractor(url);
    URL.revokeObjectURL(url);

    if (!output || !output.data) {
      console.error("Embedding failed: invalid output from extractor", output);
      return null;
    }

    return Array.from(output.data);
  } catch (e) {
    console.error("Embedding failed:", e);
    return null;
  }
}
