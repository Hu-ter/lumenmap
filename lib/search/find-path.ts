import type { TreemapNode } from "@/lib/types";
import type { SearchResult } from "@/lib/search/types";

function nodeIdentity<TValue extends number | string>(
  node: TreemapNode<TValue>,
): string | undefined {
  return node.meta?.id ?? node.id;
}

function matchesResult<TValue extends number | string>(
  node: TreemapNode<TValue>,
  result: SearchResult,
): boolean {
  const nodeId = nodeIdentity(node);

  if (result.type === "category") {
    return (
      node.meta?.type === "category" &&
      (node.meta.category === result.category || node.name === result.label)
    );
  }

  if (result.type === "protocol") {
    if (node.meta?.protocol && result.protocol) {
      return node.meta.protocol.toLowerCase() === result.protocol.toLowerCase();
    }
    return false;
  }

  if (result.type === "asset") {
    return Boolean(
      result.issuer &&
        (nodeId === result.issuer || node.meta?.id === result.issuer),
    );
  }

  if (result.id && nodeId === result.id) {
    return true;
  }

  if (
    result.label &&
    !result.id &&
    node.name.toLowerCase() === result.label.toLowerCase()
  ) {
    return true;
  }

  return false;
}

/**
 * Locate a breadcrumb path from the treemap root to a node matching the
 * search result. Returns the full path including root, or null when the
 * entity is not present in the loaded treemap.
 */
export function findTreemapPath<TValue extends number | string = number>(
  root: TreemapNode<TValue>,
  result: SearchResult,
): TreemapNode<TValue>[] | null {
  const stack: {
    node: TreemapNode<TValue>;
    path: TreemapNode<TValue>[];
  }[] = [{ node: root, path: [root] }];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      break;
    }

    const { node, path } = current;

    if (node !== root && matchesResult(node, result)) {
      return path;
    }

    const children = node.children ?? [];
    for (let i = children.length - 1; i >= 0; i -= 1) {
      const child = children[i];
      stack.push({ node: child, path: [...path, child] });
    }
  }

  return null;
}
