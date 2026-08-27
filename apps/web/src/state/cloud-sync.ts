import type { Session } from "@supabase/supabase-js";
import { migrateResumeDocument, type ResumeDocument } from "@resume-builder/core";

const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? "http://127.0.0.1:4000";

type ResumeSummary = {
  id: string;
  revision: number;
  updatedAt: string;
};

type ResumeResponse = {
  revision: number;
  document: unknown;
};

export async function loadCloudDocument(
  session: Session,
): Promise<ResumeDocument | null> {
  const list = await apiRequest<{ resumes: ResumeSummary[] }>(session, "/resumes");
  const latest = list.resumes[0];

  if (!latest) {
    return null;
  }

  const { document } = await apiRequest<ResumeResponse>(
    session,
    `/resumes/${latest.id}`,
  );

  return migrateResumeDocument(
    document as Parameters<typeof migrateResumeDocument>[0],
  );
}

export function createCloudSync(session: Session) {
  const revisions = new Map<string, number>();

  return async (resume: ResumeDocument) => {
    const knownRevision = revisions.get(resume.meta.id);

    const response = knownRevision
      ? await apiRequest<ResumeResponse>(session, `/resumes/${resume.meta.id}/sync`, {
          body: JSON.stringify({
            baseRevision: knownRevision,
            title: resume.meta.title,
            document: resume,
          }),
          method: "PATCH",
        })
      : await apiRequest<ResumeResponse>(session, "/resumes", {
          body: JSON.stringify({
            title: resume.meta.title,
            document: resume,
          }),
          method: "POST",
        });

    revisions.set(resume.meta.id, response.revision);
  };
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
    throw new Error(`API request failed with ${response.status}`);
  }

  return response.json() as Promise<T>;
}
