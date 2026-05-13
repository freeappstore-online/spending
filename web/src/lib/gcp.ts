// Thin wrapper around GCP REST. Pass the OAuth access token from useGoogleAuth.

export class GcpError extends Error {
  constructor(public status: number, public endpoint: string, message: string) {
    super(message);
    this.name = "GcpError";
  }
}

async function gcpFetch<T>(token: string, url: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new GcpError(res.status, url, body || res.statusText);
  }
  return (await res.json()) as T;
}

export interface GcpProject {
  projectId: string;
  name: string;
  projectNumber: string;
  lifecycleState: string;
  createTime?: string;
}

interface ProjectsListResponse {
  projects?: GcpProject[];
  nextPageToken?: string;
}

export async function listProjects(token: string): Promise<GcpProject[]> {
  const all: GcpProject[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL("https://cloudresourcemanager.googleapis.com/v1/projects");
    url.searchParams.set("pageSize", "500");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const data = await gcpFetch<ProjectsListResponse>(token, url.toString());
    if (data.projects) all.push(...data.projects);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return all;
}
