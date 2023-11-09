import { glob } from "glob";

export function linesToDocstring(...lines: Array<string>) {
  return ["/**", ...lines.map((line) => ` * ${line}`), " */"].join("\n");
}

export async function listFiles(
  includes: Array<string>,
  excludes: Array<string>,
) {
  const lists = await Promise.all(
    includes.map(async (include) => {
      return glob(include, { ignore: excludes });
    }),
  );
  return Array.from(new Set(lists.flat()));
}
