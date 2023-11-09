import { cac } from "cac";

import { Generator } from "./Generator.js";
import { TSFile } from "./TSFile.js";
import { retrieveConfig } from "./utils/config.js";
import { logger } from "./utils/logger.js";
import { listFiles } from "./utils/utils.js";

const cli = cac();

cli.option("--no-config", "Do not use a config file", {
  default: false,
});
cli.option("--config <path>", "Path to the config file", {
  default: "autodocs.config.js",
});
cli.option("--debug", "Enable debug mode");

cli
  .command("check", "Check if all the docs are up to date")
  .action(async (options) => {
    if (options.debug) {
      logger.debugEnabled = true;
    }
    const config = await retrieveConfig(
      options.config === true ? undefined : options.config
    );
    const fileNames = await listFiles(config.includes, config.excludes);
    logger.debug(`Found ${fileNames.length} files`);
    const files = fileNames.map((fileName) => new TSFile(fileName));
    let totalOutdated = 0;
    for (const file of files) {
      const outdated = file.getOutdatedCommentsLocation();
      if (!outdated.length) {
        logger.debug(`File: ${file.path} has no outdated comments`);
        continue;
      }
      totalOutdated += outdated.length;
      for (const comment of outdated) {
        logger.error(`Found outdated comment at ${comment}`);
      }
    }
  });

cli.command("generate", "Generate the docs").action(async (options) => {
  if (options.debug) {
    logger.debugEnabled = true;
  }
  const config = await retrieveConfig(
    options.config === false ? false : options.config
  );
  const fileNames = await listFiles(config.includes, config.excludes);
  logger.debug(`Found ${fileNames.length} files`);
  const generator = new Generator(config.openai);
  const files = fileNames.map((fileName) => new TSFile(fileName, generator));
  for (const file of files) {
    const outdated = file.getOutdatedCommentsLocation();
    if (!outdated.length) {
      logger.debug(`File: ${file.path} has no outdated comments`);
      continue;
    }
    await file.generate();
    logger.success(`New docs have been generated for ${file.path}`);
    file.write();
  }
  const consumption = generator.getComsumption();
  logger.info(
    `Total cost for ${consumption.completions} completions (${
      consumption.prompt_tokens
    } prompt tokens and ${
      consumption.completion_tokens
    } completion tokens): $${consumption.cost.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })}`
  );
});

try {
  cli.help();
  cli.parse();
} catch (error) {
  if (error instanceof Error) {
    logger.error(error.message);
  }
  process.exit(1);
}

process.on("unhandledRejection", (error) => {
  if (error instanceof Error) {
    logger.error(error.message);
  }
  process.exit(1);
});
