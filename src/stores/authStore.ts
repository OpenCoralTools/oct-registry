import { atom } from 'nanostores';
import { Octokit } from 'octokit';

export interface User {
  login: string;
  avatar_url: string;
  name: string;
}

export const $token = atom<string | null>(null);
export const $user = atom<User | null>(null);
export const $loading = atom<boolean>(true);

// Initialize from localStorage
if (typeof window !== 'undefined') {
  const storedToken = localStorage.getItem('github_token');
  if (storedToken) {
    validateAndSetToken(storedToken);
  } else {
    $loading.set(false);
  }
}

export async function validateAndSetToken(newToken: string) {
  $loading.set(true);
  try {
    const octokit = new Octokit({ auth: newToken });
    const { data } = await octokit.rest.users.getAuthenticated();
    $user.set({
      login: data.login,
      avatar_url: data.avatar_url,
      name: data.name || data.login,
    });
    $token.set(newToken);
    localStorage.setItem('github_token', newToken);
  } catch (error) {
    console.error('Invalid token', error);
    logout();
  } finally {
    $loading.set(false);
  }
}

export function logout() {
  $token.set(null);
  $user.set(null);
  localStorage.removeItem('github_token');
}

