/**
 * Load everything the site renders.
 *
 * Reference data is read from `workbench/data/*.json`, the snapshot generated
 * from this checkout (`npm run workbench:data`). Sample evidence is read from
 * `site/data/`, captured once by `site/scripts/capture-evidence.mjs`.
 */
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

export const loadData = async (root) => {
  const workbench = join(root, "workbench", "data");
  const site = join(root, "site", "data");

  const [tools, cli, docs, product, repo, manifest, prompts] =
    await Promise.all([
      readJson(join(workbench, "tools.json")),
      readJson(join(workbench, "cli.json")),
      readJson(join(workbench, "docs.json")),
      readJson(join(workbench, "product.json")),
      readJson(join(workbench, "repo.json")),
      readJson(join(workbench, "manifest.json")),
      readJson(join(workbench, "prompts.json")),
    ]);

  const [application, artifact] = await Promise.all([
    readJson(join(site, "sample-application.json")),
    readJson(join(site, "sample-artifact.json")),
  ]);

  const evidenceBytes = {
    application: (await stat(join(site, "evidence-application.json"))).size,
    artifact: (await stat(join(site, "evidence-artifact.json"))).size,
  };

  const docWords = docs.docs.reduce((total, doc) => total + doc.words, 0);
  const kinds = new Map(tools.tools.map((tool) => [tool.kind, tool]));
  const readonly = tools.tools.filter(
    (tool) => tool.annotations.readOnly,
  ).length;
  const destructive = tools.tools.filter(
    (tool) => tool.annotations.destructive,
  ).length;
  const sessionTools = tools.tools.filter((tool) => tool.session).length;

  return {
    tools,
    cli,
    docs,
    product,
    repo,
    manifest,
    prompts,
    application,
    artifact,
    evidenceBytes,
    stats: {
      tools: tools.total,
      kinds: tools.kinds.length,
      families: tools.families.length,
      commands: cli.primaryCount,
      aliases: cli.aliases?.length ?? cli.commands.length - cli.primaryCount,
      documents: docs.docs.length,
      docWords,
      providers: product.providers.length,
      clients: product.setup_clients.length,
      prompts: prompts.prompts?.length ?? 0,
      productionLines: repo.totals.productionLines,
      productionFiles: repo.totals.productionFiles,
      testLines: repo.totals.testLines,
      modules: repo.totals.modules,
      readonly,
      destructive,
      sessionTools,
      toolKinds: kinds.size,
    },
    version: manifest.package.version,
    packageName: manifest.package.name,
    commit: manifest.checkout.commit,
    branch: manifest.checkout.branch,
    generatedAt: manifest.generatedAt,
  };
};
