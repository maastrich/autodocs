import { DocExcerpt, DocNode } from "@microsoft/tsdoc";

export function retrieveHash(node: DocNode) {
  let result: string = "";
  if (!(node instanceof DocExcerpt)) {
    for (const child of node.getChildNodes()) {
      result += retrieveHash(child);
    }
  } else {
    result += node.content.toString();
  }
  return result;
}
