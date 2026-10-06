import type { Project } from "./types";
import { putAsset } from "./asset-store";
import { rehydrateAssets } from "./store";

const FORMAT = "dx5ve-led-project";

/** Download a project (with all uploaded media embedded) as a .json file. */
export async function exportProjectFile(project: Project) {
  const full = await rehydrateAssets(project);
  const blob = new Blob([JSON.stringify({ format: FORMAT, version: 1, project: full })], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${project.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.dx5ve.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Read an exported file, store its media in IndexedDB and return the project. */
export async function readProjectFile(file: File): Promise<Project> {
  const data = JSON.parse(await file.text());
  const project = (data?.format === FORMAT ? data.project : data) as Project;
  if (!project || !project.id || !Array.isArray(project.screens)) {
    throw new Error("This file is not a DX5VE project export");
  }
  const jobs: Promise<void>[] = [];
  if (project.meta?.coverAssetId && project.meta.coverImage)
    jobs.push(putAsset(project.meta.coverAssetId, project.meta.coverImage));
  for (const m of project.media ?? []) if (m.assetId && m.src) jobs.push(putAsset(m.assetId, m.src));
  for (const s of project.screens)
    if (s.contentAssetId && s.contentImage) jobs.push(putAsset(s.contentAssetId, s.contentImage));
  await Promise.all(jobs);
  return project;
}
