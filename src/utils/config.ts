import { join } from "path";

import { logger } from "./logger.js";
import { models } from "./models.js";

const defaultPompt = `
Generate TSDoc for the following code as raw content - no block decoration * using this template (do not include types):
{summary}
@returns {returns}
@throws {throws}
@description {description}
` as const;

export type Config = {
  openai: {
    /**
     * The API key to use for OpenAI
     * @default process.env.OPENAI_API_KEY
     */
    apiKey: string | null;
    /**
     * The model to use for the prompt
     * @default "gpt-3.5-turbo"
     */
    model: keyof typeof models;
    /**
     * The prefix to use for the prompt
     */
    prompt: string;

    /**
     * The maximum tokens to generate
     * @default 4000
     */
    maxTokens?: number;
  };
  /**
   * The files to include in the generation as glob patterns
   */
  includes: Array<string>;
  /**
   * The files to exclude from the generation as glob patterns
   */
  excludes: Array<string>;
};

type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

const defaultOpenAIConfig: Config["openai"] = {
  apiKey: process.env.OPENAI_API_KEY ?? null,
  model: "gpt-3.5-turbo",
  prompt: defaultPompt,
  maxTokens: 4000,
};

const defaultIncludes = ["src/**/*.{ts,tsx}"];

export function defineConfig(config: RecursivePartial<Config>): Config {
  const {
    excludes = new Array<string>(),
    includes = defaultIncludes,
    openai = defaultOpenAIConfig,
  } = config;
  if (!includes.length) {
    throw new Error("You must provide at least one include pattern");
  }
  if (includes === defaultIncludes) {
    logger.warn(
      "No include pattern provided, using the default one: src/**/*.{ts,tsx}",
    );
  }
  return {
    includes: includes,
    excludes: excludes ?? new Array<string>(),
    openai: {
      ...defaultOpenAIConfig,
      ...openai,
    },
  };
}

export async function retrieveConfig(path: string | false): Promise<Config> {
  if (path === false) {
    return defineConfig({});
  }
  const { default: config } = await import(
    join(process.cwd(), path ?? "autodocs.config.ts")
  );
  return defineConfig(config);
}
