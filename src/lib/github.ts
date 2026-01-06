import { Octokit } from 'octokit';
import { REPO_OWNER, REPO_NAME } from '../consts';

export type FileContent = {
  sha: string;
  content: string; // decoded content
};

export class GitHubService {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  async getCurrentUser() {
    const { data } = await this.octokit.rest.users.getAuthenticated();
    return data;
  }

  async getFileContent(path: string): Promise<FileContent> {
    try {
      const { data } = await this.octokit.rest.repos.getContent({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path,
      });

      if (!Array.isArray(data) && 'content' in data) {
        return {
          sha: data.sha,
          content: atob(data.content.replace(/\n/g, '')),
        };
      }
      throw new Error('Path is a directory or invalid');
    } catch (error) {
      console.error('Error fetching file:', error);
      throw error;
    }
  }

  async updateFileDirectly(
    path: string,
    content: string,
    message: string,
    sha: string
  ) {
    const encodedContent = btoa(content);
    
    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      message,
      content: encodedContent,
      sha,
    });
  }

  async createPullRequest(
    path: string,
    content: string,
    message: string,
    sha: string,
    title: string,
    body: string
  ) {
    const user = await this.getCurrentUser();
    const branchName = `update-${path.replace(/\W/g, '-')}-${Date.now()}`;
    const mainBranchRef = await this.octokit.rest.git.getRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: 'heads/main'
    });

    // 1. Create a branch (assuming user has write access for now)
    // TODO: Handle Fork logic for non-collaborators
    await this.octokit.rest.git.createRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `refs/heads/${branchName}`,
      sha: mainBranchRef.data.object.sha,
    });

    // 2. Commit file
    const encodedContent = btoa(content);
    await this.octokit.rest.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      message,
      content: encodedContent,
      sha, // sha of the file on main, needed to update? No, on new branch it's same sha.
      branch: branchName,
    });

    // 3. Create PR
    const { data: pr } = await this.octokit.rest.pulls.create({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      title,
      body,
      head: branchName,
      base: 'main',
    });

    return pr;
  }
}

