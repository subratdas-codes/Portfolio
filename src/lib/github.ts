// ============================================================================
// GitHub Integration — fetches public data from the GitHub REST API.
// No manual updates needed; data is pulled live for the public site.
// Handles unauthenticated rate limits (60 req/hr) gracefully with caching.
// ============================================================================

export interface GitHubRepo {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  updated_at: string;
  topics: string[];
  homepage: string | null;
  fork: boolean;
}

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  followers: number;
  following: number;
  public_repos: number;
  html_url: string;
}

export interface GitHubStats {
  user: GitHubUser | null;
  repos: GitHubRepo[];
  totalStars: number;
  languages: { name: string; percent: number }[];
  recentCommits: { repo: string; message: string; date: string; url: string }[];
  error: string | null;
}

const CACHE_TTL = 1000 * 60 * 10; // 10 min

function cacheKey(username: string) {
  return 'gh_cache_' + username;
}

function readCache(username: string): { data: GitHubStats; ts: number } | null {
  try {
    const raw = localStorage.getItem(cacheKey(username));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeCache(username: string, data: GitHubStats) {
  try {
    localStorage.setItem(cacheKey(username), JSON.stringify({ data, ts: Date.now() }));
  } catch {
    /* ignore */
  }
}

export async function fetchGitHubData(username: string): Promise<GitHubStats> {
  if (!username || username.trim() === '') {
    return { user: null, repos: [], totalStars: 0, languages: [], recentCommits: [], error: 'No GitHub username configured. Set it in Admin → Profile.' };
  }

  // Return cached data if fresh
  const cached = readCache(username);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const empty: GitHubStats = { user: null, repos: [], totalStars: 0, languages: [], recentCommits: [], error: null };

  try {
    const headers: HeadersInit = {
      Accept: 'application/vnd.github+json',
    };

    // Fetch user + repos in parallel
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`, { headers }),
      fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { headers }),
    ]);

    // Handle rate limit specifically
    if (userRes.status === 403) {
      // Rate limited — use cached data even if stale, or show friendly error
      if (cached) return cached.data;
      return { ...empty, error: 'GitHub API rate limit reached. Data will refresh shortly. Visit the profile directly.' };
    }

    if (userRes.status === 404) {
      return { ...empty, error: `GitHub user "${username}" not found. Check the username in Admin → Profile.` };
    }

    if (!userRes.ok) throw new Error(`GitHub API error (${userRes.status})`);

    const user: GitHubUser = await userRes.json();

    // Repos may fail independently (rate limit)
    let allRepos: GitHubRepo[] = [];
    if (reposRes.ok) {
      allRepos = await reposRes.json();
    } else if (cached) {
      // Use cached repos if available
      return cached.data;
    }

    // Exclude forks, sort by stars then recency
    const repos = allRepos
      .filter((r) => !r.fork)
      .sort((a, b) => b.stargazers_count - a.stargazers_count || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 6);

    const totalStars = allRepos.reduce((s, r) => s + r.stargazers_count, 0);

    // Language distribution
    const langCount: Record<string, number> = {};
    allRepos.forEach((r) => {
      if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
    });
    const totalLangs = Object.values(langCount).reduce((a, b) => a + b, 0) || 1;
    const languages = Object.entries(langCount)
      .map(([name, count]) => ({ name, percent: Math.round((count / totalLangs) * 100) }))
      .sort((a, b) => b.percent - a.percent)
      .slice(0, 6);

    // Recent commits (best-effort; may hit rate limits)
    let recentCommits: GitHubStats['recentCommits'] = [];
    try {
      const evRes = await fetch(`https://api.github.com/users/${username}/events/public?per_page=30`, { headers });
      if (evRes.ok) {
        const events = await evRes.json();
        recentCommits = events
          .filter((e: { type: string }) => e.type === 'PushEvent')
          .flatMap((e: { repo: { name: string }; created_at: string; payload: { commits: { message: string; url: string }[] } }) =>
            (e.payload.commits || []).slice(0, 1).map((c) => ({
              repo: e.repo.name.split('/').pop() || '',
              message: c.message.split('\n')[0],
              date: e.created_at,
              url: c.url.replace('api.github.com/repos', 'github.com').replace('/commits/', '/commit/'),
            }))
          )
          .slice(0, 8);
      }
    } catch {
      /* rate limited — skip */
    }

    const result: GitHubStats = { user, repos, totalStars, languages, recentCommits, error: null };
    writeCache(username, result);
    return result;
  } catch (e) {
    // On any error, fall back to cached data if available
    if (cached) return cached.data;
    return { ...empty, error: e instanceof Error ? e.message : 'Failed to load GitHub data' };
  }
}
