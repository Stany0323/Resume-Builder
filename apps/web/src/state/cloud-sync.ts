import type { Session } from "@supabase/supabase-js";
import { migrateResumeDocument, type ResumeDocument } from "@resume-builder/core";

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://127.0.0.1:4000";

type ResumeSummary = {
  id: string;
  revision: number;
  updatedAt: string;
};

/**
 * The API wraps single-resume responses in a `resume` envelope — create, get
 * and sync all return `{ resume: { id, revision, document, … } }`. Reading them
 * flat yields `undefined` for both `revision` and `document`, which fails
 * quietly: the cloud load throws, the caller falls back to IndexedDB, and
 * nothing tells you the server was never actually read.
 */
type ResumeEnvelope = {
  resume: {
    id: string;
    revision: number;
    createdAt: string;
    updatedAt: string;
    document: unknown;
  };
};
export type AssetKind = "profilePhoto" | "institutionLogo" | "companyLogo";

type AssetEnvelope = {
  asset: {
    id: string;
    kind: AssetKind;
    storagePath: string;
    url: string;
    createdAt: string;
  };
};

export async function loadCloudDocument(
  session: Session,
): Promise<ResumeDocument | null> {
  // Ordered by updatedAt desc server-side, so the first entry is the latest.
  const list = await apiRequest<{ resumes: ResumeSummary[] }>(session, "/resumes");
  const latest = list.resumes[0];

  if (!latest) {
    return null;
  }

  const { resume } = await apiRequest<ResumeEnvelope>(
    session,
    `/resumes/${latest.id}`,
  );

  if (!resume?.document) {
    throw new Error(`Resume ${latest.id} came back without a document.`);
  }

  return migrateResumeDocument(
    resume.document as Parameters<typeof migrateResumeDocument>[0],
  );
}

export function createCloudSync(session: Session) {
  const revisions = new Map<string, number>();

  return async (document: ResumeDocument) => {
    const knownRevision = revisions.get(document.meta.id);

    // The server keys resumes by `document.meta.id`, so the client id and the
    // row id are the same value — that's what makes PATCH-by-local-id valid.
    const { resume } = knownRevision
      ? await apiRequest<ResumeEnvelope>(session, `/resumes/${document.meta.id}/sync`, {
          body: JSON.stringify({
            baseRevision: knownRevision,
            title: document.meta.title,
            document,
          }),
          method: "PATCH",
        })
      : await apiRequest<ResumeEnvelope>(session, "/resumes", {
          body: JSON.stringify({
            title: document.meta.title,
            document,
          }),
          method: "POST",
        });

    if (typeof resume?.revision !== "number") {
      throw new Error("Sync response carried no revision.");
    }

    revisions.set(document.meta.id, resume.revision);
    return resume.revision;
  };
}

export async function uploadAsset(
  session: Session,
  input: {
    dataUrl: string;
    fileName?: string;
    kind: AssetKind;
  },
) {
  const { asset } = await apiRequest<AssetEnvelope>(session, "/assets", {
    body: JSON.stringify(input),
    method: "POST",
  });

  return asset;
}

export async function replaceAsset(
  session: Session,
  input: {
    dataUrl: string;
    fileName?: string;
    kind: AssetKind;
    previousUrl?: string;
  },
) {
  const { asset } = await apiRequest<AssetEnvelope>(session, "/assets/replace", {
    body: JSON.stringify(input),
    method: "POST",
  });

  return asset;
}

export async function deleteAssetByUrl(
  session: Session,
  input: {
    kind: AssetKind;
    url: string;
  },
) {
  await apiRequest<{ deleted: boolean }>(
    session,
    `/assets?kind=${encodeURIComponent(input.kind)}&url=${encodeURIComponent(input.url)}`,
    { method: "DELETE" },
  );
}

async function apiRequest<T>(
  session: Session,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    // Include the body — a bare status code turns every backend error into the
    // same opaque failure, which is how the envelope bug stayed hidden.
    const detail = await response.text().catch(() => "");
    throw new Error(
      `${init.method ?? "GET"} ${path} failed with ${response.status}${detail ? `: ${detail.slice(0, 300)}` : ""}`,
    );
  }

  return response.json() as Promise<T>;
}
