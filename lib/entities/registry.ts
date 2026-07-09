import entities from "@/data/entities.json";
import type { EntityInfo } from "@/lib/types";

const registry = entities as Record<string, EntityInfo>;

export function lookupEntity(id: string): EntityInfo | null {
  return registry[id] ?? null;
}

export function getProtocolLabel(id: string): string {
  const entity = lookupEntity(id);
  if (entity) {
    return entity.protocol;
  }

  if (id.startsWith("C")) {
    return "Unknown Contracts";
  }

  return "Unknown Accounts";
}

export function getDisplayName(id: string): string {
  const entity = lookupEntity(id);
  if (entity) {
    return entity.name;
  }

  if (id.length > 12) {
    return `${id.slice(0, 6)}...${id.slice(-4)}`;
  }

  return id;
}

export function getAllEntities(): Record<string, EntityInfo> {
  return registry;
}
