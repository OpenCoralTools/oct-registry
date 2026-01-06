import { useStore } from '@nanostores/react';
import { ExternalLink, Github, LogOut, X } from 'lucide-react';
import React, { useState } from 'react';
import { $loading, $user, logout, validateAndSetToken } from '../stores/authStore';

export default function Navbar() {
  const user = useStore($user);
  const loading = useStore($loading);
  const [showLogin, setShowLogin] = useState(false);
  const [pat, setPat] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pat) return;
    await validateAndSetToken(pat);
    setShowLogin(false);
    setPat('');
  };

  return (
    <nav className="bg-slate-900 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <a href={import.meta.env.BASE_URL} className="text-xl font-bold flex items-center gap-2">
          <Github className="w-6 h-6" />
          OpenCoralTools Registry
        </a>

        <div className="flex items-center gap-4">
          {loading ? (
            <span className="text-slate-400">Loading...</span>
          ) : user ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full" />
                <span className="hidden sm:inline">{user.name}</span>
              </div>
              <button
                onClick={logout}
                className="p-2 hover:bg-slate-800 rounded-full transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowLogin(true)}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-md transition-colors"
            >
              Connect GitHub
            </button>
          )}
        </div>
      </div>

      {showLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white text-slate-900 p-6 rounded-lg w-full max-w-md relative">
            <button
              onClick={() => setShowLogin(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-700"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Connect to GitHub</h2>

            <div className="bg-blue-50 text-blue-800 p-4 rounded-md mb-4 text-sm">
              <p className="font-semibold mb-2">How to get a Token:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">GitHub Developer Settings <ExternalLink className="w-3 h-3" /></a></li>
                <li>Generate a <strong>New personal access token (classic)</strong></li>
                <li>Set a Note (e.g. "OpenCoralTools Registry")</li>
                <li>Select the <strong>repo</strong> scope (required to save changes)</li>
                <li>Click <strong>Generate token</strong> and copy it here</li>
              </ol>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Personal Access Token</label>
                <input
                  type="password"
                  value={pat}
                  onChange={(e) => setPat(e.target.value)}
                  className="w-full border rounded-md p-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="ghp_..."
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 font-medium"
              >
                Connect
              </button>
            </form>
          </div>
        </div>
      )}
    </nav>
  );
}
