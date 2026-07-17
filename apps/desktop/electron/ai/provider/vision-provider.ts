import { aiConfig } from "../config/ai.config";
import { readFile } from "node:fs/promises";
import http from "node:http";

interface VisionRequest {
  imagePath: string;
  prompt: string;
}

function normalizeImagePath(
  filePath: string
): string {

  if (filePath.startsWith("C:\\")) {
    return filePath
      .replace(/^C:\\/, "/mnt/c/")
      .replace(/\\/g, "/");
  }

  return filePath;
}

class VisionProvider {

  async analyze(
    request: VisionRequest
  ): Promise<string> {

    const normalizedPath =
      normalizeImagePath(request.imagePath);

    const imageBuffer =
      await readFile(normalizedPath);

    const imageBase64 =
      imageBuffer.toString("base64");

    const body = JSON.stringify({
      model: "llava:latest",
      prompt: request.prompt,
      images: [imageBase64],
      stream: false,
    });

    return new Promise<string>((resolve, reject) => {

      const req = http.request(
        {
          hostname: "localhost",
          port: 11434,
          path: "/api/generate",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(body),
            "Connection": "close",
          },
        },
        (res) => {

          let data = "";

          res.setEncoding("utf8");

          res.on("data", chunk => {
            data += chunk;
          });

          res.on("end", () => {

            try {

              const json = JSON.parse(data);

              if (json.error) {
                reject(new Error(json.error));
                return;
              }

              resolve(json.response);

            } catch (err) {
              reject(err);
            }

          });

        }
      );

      req.on("error", reject);

      req.write(body);

      req.end();

    });

  }

}

export const visionProvider =
  new VisionProvider();