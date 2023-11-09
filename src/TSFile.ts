import {
  DocBlock,
  TSDocParser,
  TSDocTagDefinition,
  TSDocConfiguration,
  TSDocTagSyntaxKind,
} from "@microsoft/tsdoc";

import { type Comment, Parser } from "acorn";
import { tsPlugin as typescript } from "acorn-typescript";
import { findNodeAfter } from "acorn-walk";
import { createHash } from "crypto";
import { readFileSync, writeFileSync } from "fs";

import { Generator } from "./Generator.js";
import { logger } from "./utils/logger.js";
import { retrieveHash } from "./utils/retrieve-hash.js";
import { linesToDocstring } from "./utils/utils.js";

const acorn = Parser.extend(
  // @ts-expect-error
  typescript(),
);

const autodocsTag = new TSDocTagDefinition({
  tagName: "@autodocs",
  syntaxKind: TSDocTagSyntaxKind.BlockTag,
  allowMultiple: false,
});

const tsdocConfiguration = new TSDocConfiguration();
tsdocConfiguration.addTagDefinition(autodocsTag);

const acornOptions = {
  allowAwaitOutsideFunction: true,
  allowHashBang: true,
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowSuperOutsideMethod: true,
  allowReserved: true,
};

export class TSFile {
  private offset = 0;
  private parser = new TSDocParser(tsdocConfiguration);
  private comments = new Array<
    Comment & {
      tsdoc: DocBlock;
      after?: string;
      synched: boolean;
      hash: string;
    }
  >();
  private content: string;

  constructor(
    public path: string,
    private generator?: Generator,
  ) {
    this.content = readFileSync(path, "utf-8").toString();
    this.parse();
  }

  public parse() {
    const tsfile = this;
    const ast = acorn.parse(this.content, {
      ...acornOptions,
      ecmaVersion: 2023,
      sourceType: "module",
      locations: true,
      onComment(block, text, start, end, locStart, locEnd) {
        if (!block) {
          return;
        }
        const context = tsfile.parser.parseString(`/*${text}*/`);
        const autodocs = context.docComment.customBlocks.find(
          (block) =>
            block.blockTag.tagNameWithUpperCase ===
            autodocsTag.tagNameWithUpperCase,
        );
        if (!autodocs) {
          return;
        }
        tsfile.comments.push({
          loc: {
            start: locStart,
            end: locEnd,
          },
          end,
          start,
          hash: "",
          type: "Block",
          synched: false,
          tsdoc: autodocs,
          value: `/*${text}*/`,
        });
      },
    });
    logger.debug(
      `Parsing file ${this.path} { content-length: ${this.content.length}, comments: ${this.comments.length} }`,
    );
    for (const comment of this.comments) {
      const { node } = findNodeAfter(ast, comment.end);
      const after = this.content.slice(node.start, node.end);
      comment.after = after;
      const prev = retrieveHash(comment.tsdoc).trim();
      const hash = createHash("sha256").update(after).digest("hex");
      comment.hash = hash;
      logger.debug(
        `Comment { new: ${hash} old: ${prev.replace("@autodocs ", "")} }`,
      );
      if (prev === `@autodocs ${hash}`) {
        comment.synched = true;
      }
    }
  }

  public async generate() {
    if (!this.generator) {
      throw new Error("No generator provided");
    }
    const newComments = await Promise.all(
      this.comments.map(async (comment) => {
        try {
          if (comment.synched) {
            logger.debug(`Comment ${comment.hash} is already synched`);
            throw new Error("Already synched");
          }
          const docstring = await this.generator.generate({
            messages: [comment.after],
            stop: ["*/"],
          });
          return {
            comment,
            docstring: linesToDocstring(
              ...docstring,
              `@autodocs ${comment.hash}`,
            ),
          };
        } catch {
          return {
            comment,
            docstring: null,
          };
        }
      }),
    );
    for (const { docstring, comment } of newComments) {
      if (!docstring) {
        continue;
      }
      const before = this.content.slice(0, comment.start + this.offset);
      const after = this.content.slice(comment.end + this.offset);
      this.offset += docstring.length - comment.value.length;
      this.content = before + docstring + after;
    }
  }

  public write() {
    return writeFileSync(this.path, this.content);
  }

  public getOutdatedCommentsLocation() {
    return this.comments
      .filter((comment) => !comment.synched)
      .map((comment) => {
        const loc = comment.loc;
        if (!loc) {
          return this.path;
        }
        return `${this.path}:${loc.start.line}:${loc.start.column}`;
      });
  }
}
