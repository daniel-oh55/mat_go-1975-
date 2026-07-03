/**
 * Content Layer: minimal StoryDefinition graph validation (Layer 1).
 *
 * Checks structural graph integrity only — does it have IDs, do links resolve,
 * is at least one ending reachable. Does not validate region/NPC/art/BGM/reward
 * metadata (none of that exists in the schema yet — see
 * docs/27_mvp_content_authoring_boundary.md §4), and does not evaluate
 * UnlockCondition — that is Application Layer runtime behavior, not content
 * graph structure. See docs/28_story_schema_content_validation_review.md §5–§7
 * for the full design rationale.
 *
 * Dependency rule: type-only import from src/content/schemas/storySchema.ts.
 * Must NOT import src/engine/, src/application/, src/components/,
 * src/platform/, any concrete story file, or the content registry.
 */

import type { StoryDefinition, StoryNode, StoryNodeId } from '../schemas/storySchema.js';

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<string>;
}

function ok(): ValidationResult {
  return { valid: true, errors: [] };
}

function fail(errors: ReadonlyArray<string>): ValidationResult {
  return { valid: false, errors };
}

/** Outgoing edges for reachability traversal. UnlockCondition is ignored — see module doc. */
function getEdges(node: StoryNode): ReadonlyArray<StoryNodeId> {
  if (node.type === 'dialogue' || node.type === 'match') return node.next;
  if (node.type === 'choice') return node.choices.map((choice) => choice.nextNodeId);
  return [];
}

/**
 * Validates the structural graph integrity of a single StoryDefinition.
 *
 * Pure function: no mutation, no storage, no registry access, no side effects.
 * Never throws for invalid content — invalid content is reported via
 * ValidationResult.errors, not exceptions.
 */
export function validateStoryDefinition(definition: StoryDefinition): ValidationResult {
  const errors: string[] = [];

  if (definition.storyId.trim().length === 0) {
    errors.push('StoryDefinition.storyId must be a non-empty string.');
  }

  if (definition.nodes.length === 0) {
    errors.push('StoryDefinition.nodes must contain at least one node.');
    return fail(errors);
  }

  definition.nodes.forEach((node, index) => {
    if (node.nodeId.trim().length === 0) {
      errors.push(`StoryNode at index ${index} has an empty nodeId.`);
    }
  });

  const seenNodeIds = new Set<string>();
  const duplicateNodeIds = new Set<string>();
  for (const node of definition.nodes) {
    if (seenNodeIds.has(node.nodeId)) {
      duplicateNodeIds.add(node.nodeId);
    }
    seenNodeIds.add(node.nodeId);
  }
  for (const nodeId of duplicateNodeIds) {
    errors.push(`Duplicate StoryNode.nodeId found: ${nodeId}.`);
  }

  const nodesById = new Map<string, StoryNode>();
  for (const node of definition.nodes) {
    if (!nodesById.has(node.nodeId)) {
      nodesById.set(node.nodeId, node);
    }
  }

  const startNodeExists = nodesById.has(definition.startNodeId);
  if (!startNodeExists) {
    errors.push(`StoryDefinition.startNodeId "${definition.startNodeId}" does not exist in nodes.`);
  }

  for (const node of definition.nodes) {
    if (node.type === 'dialogue') {
      for (const nextId of node.next) {
        if (!nodesById.has(nextId)) {
          errors.push(`Dialogue node "${node.nodeId}" has unresolved next nodeId: ${nextId}.`);
        }
      }
    } else if (node.type === 'match') {
      for (const nextId of node.next) {
        if (!nodesById.has(nextId)) {
          errors.push(`Match node "${node.nodeId}" has unresolved next nodeId: ${nextId}.`);
        }
      }
    } else if (node.type === 'choice') {
      for (const choice of node.choices) {
        if (!nodesById.has(choice.nextNodeId)) {
          errors.push(
            `Choice node "${node.nodeId}" choice "${choice.choiceId}" has unresolved nextNodeId: ${choice.nextNodeId}.`,
          );
        }
      }
    }
  }

  if (startNodeExists) {
    const visited = new Set<string>();
    const queue: string[] = [definition.startNodeId];
    let reachableEndFound = false;

    while (queue.length > 0) {
      const currentId = queue.shift() as string;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      const currentNode = nodesById.get(currentId);
      if (currentNode === undefined) continue;

      if (currentNode.type === 'end') {
        reachableEndFound = true;
        break;
      }

      for (const nextId of getEdges(currentNode)) {
        if (!visited.has(nextId)) queue.push(nextId);
      }
    }

    if (!reachableEndFound) {
      errors.push(
        `StoryDefinition must have at least one end node reachable from startNodeId "${definition.startNodeId}".`,
      );
    }
  }

  return errors.length === 0 ? ok() : fail(errors);
}
