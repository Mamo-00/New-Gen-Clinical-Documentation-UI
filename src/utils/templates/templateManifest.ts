// src/templates/templateManifest.ts
export interface TemplateInfo {
  name: string;
  url: string;
  category: string;
}

const modules = import.meta.glob("../../data/macro-templates/**/*.txt", {
  eager: true,
  query: "?url",
  import: "default",
});

export const templates: TemplateInfo[] = Object.keys(modules).map((path) => {
  // path example: "/templates/glass/glass1.txt" or "/templates/hudbit/someTemplate.txt"
  const pathParts = path.split("/");
  // Expect pathParts = [ "", "templates", "glass", "glass1.txt" ]
  // Adjust indexes if needed.
  const category = pathParts[4] || "unknown";
  const fileWithExt = pathParts[pathParts.length - 1];
  const match = fileWithExt.match(/(.*)\.txt$/);
  const name = match ? match[1] : fileWithExt;
  return { name, url: modules[path] as string, category };
});
