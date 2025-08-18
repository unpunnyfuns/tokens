import { TokenFileReader } from "../filesystem/file-reader.js";
import type { UPFTResolverManifest } from "./upft-types.js";

/**
 * Read and parse a manifest file
 */
export async function readManifest(
  filePath: string,
  basePath = process.cwd(),
): Promise<UPFTResolverManifest> {
  const fileReader = new TokenFileReader({
    basePath,
    enableCache: false,
  });

  const fileContent = await fileReader.readFile(filePath);
  const manifest = fileContent.tokens as unknown as UPFTResolverManifest;

  if (!(manifest.sets && Array.isArray(manifest.sets))) {
    throw new Error(
      `Invalid manifest: missing or invalid 'sets' array in ${filePath}`,
    );
  }

  if (!manifest.modifiers || typeof manifest.modifiers !== "object") {
    throw new Error(
      `Invalid manifest: missing or invalid 'modifiers' object in ${filePath}`,
    );
  }

  return manifest;
}
