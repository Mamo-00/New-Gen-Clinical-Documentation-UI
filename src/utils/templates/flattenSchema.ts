// src/utils/flattenSchema.ts
import { TemplateField } from "../../components/Trees/interfaces/iTemplateField";

/**
 * Recursively flattens a TemplateField tree so that each leaf field is available
 * as a key in the returned object. Each field is indexed by its `id`.
 *
 * @param schema - The template field (or container) to flatten.
 * @returns A mapping from field id to the corresponding field definition.
 */
export function flattenSchema(schema: TemplateField): Record<string, TemplateField> {
  let result: Record<string, TemplateField> = {};

  // If the current schema node is a container and has children, recursively flatten them.
  if (schema.children && schema.children.length > 0) {
    schema.children.forEach(child => {
      result = { ...result, ...flattenSchema(child) };
    });
  } else {
    // Otherwise, assume this is a leaf field.
    result[schema.id] = schema;
  }
  return result;
}
