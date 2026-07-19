import { useState, useEffect, useCallback } from "react";
import { GitHubUser, GitHubRepo } from "./types";
import LoginScreen from "./components/LoginScreen";
import RepoList from "./components/RepoList";
import RepoExplorer from "./components/RepoExplorer";
import { Github, LogOut, Users, BookMarked, Layers, Globe, ExternalLink, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Repositories state
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [reposError, setReposError] = useState<string | null>(null);

  // Active workspace state
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);

  // Fetch repositories of authenticated user
  const fetchRepos = useCallback(async () => {
    setLoadingRepos(true);
    setReposError(null);
    try {
      const res = await fetch("/api/github/repos");
      if (!res.ok) {
        throw new Error("Failed to retrieve your GitHub repositories.");
      }
      const data = await res.json();
      setRepos(data);
    } catch (err: any) {
      console.error(err);
      setReposError(err.message || "An error occurred while loading your repositories.");
    } finally {
      setLoadingRepos(false);
    }
  }, []);

  // Check auth status
  const checkAuthStatus = useCallback(async () => {
    setCheckingAuth(true);
    try {
      const res = await fetch("/api/auth/status");
      if (!res.ok) throw new Error("Network error checking session.");
      const data = await res.json();
      
      if (data.authenticated && data.user) {
        setAuthenticated(true);
        setUser(data.user);
        // Immediately fetch repositories on success
        fetchRepos();
      } else {
        setAuthenticated(false);
        setUser(null);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      setAuthenticated(false);
      setUser(null);
    } finally {
      setCheckingAuth(false);
    }
  }, [fetchRepos]);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Handle successful login from popup
  const handleLoginSuccess = () => {
    checkAuthStatus();
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Error logging out:", err);
    } finally {
      setAuthenticated(false);
      setUser(null);
      setRepos([]);
      setSelectedRepo(null);
    }
  };

  // Back to repository selection
  const handleBackToRepos = () => {
    setSelectedRepo(null);
    // Refresh repo metadata silently on going back
    fetchRepos();
  };

  // Handle Selecting a repo
  const handleSelectRepo = (repo: GitHubRepo) => {
    setSelectedRepo(repo);
  };

  if (checkingAuth) {
    return (
      <div id="loading-fallback" className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center font-sans">
        <div className="w-12 h-12 border-2 border-[#161b22] border-t-[#58a6ff] rounded-full animate-spin mb-4" />
        <p className="text-sm text-[#8b949e]">Verifying secure session...</p>
      </div>
    );
  }

  if (!authenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div id="app-root" className="min-h-screen bg-[#0d1117] text-[#c9d1d9] flex flex-col font-sans selection:bg-[#58a6ff]/30">
      {/* Decorative top-most horizontal track */}
      <div className="w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 shrink-0" />

      {/* Main Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#161b22]/95 backdrop-blur border-b border-[#30363d] p-4 shrink-0 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* App Logo */}
          <div 
            onClick={handleBackToRepos}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all"
          >
            <div className="w-9 h-9 bg-[#21262d] border border-[#30363d] rounded-xl flex items-center justify-center text-white">
              <Github className="w-5 h-5 animate-pulse" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-white tracking-tight">GitHub Explorer</h1>
              <p className="text-[10px] text-[#8b949e] font-mono leading-none">Console Version 1.0</p>
            </div>
          </div>

          {/* User Account / Navigation panel */}
          {user && (
            <div className="flex items-center gap-4">
              {/* Profile Card */}
              <div className="flex items-center gap-3 bg-[#0d1117] border border-[#30363d] px-3.5 py-1.5 rounded-xl">
                <img
                  src={user.avatar_url}
                  alt={user.login}
                  className="w-7 h-7 rounded-full border border-[#30363d]"
                  referrerPolicy="no-referrer"
                />
                <div className="hidden md:block">
                  <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1">
                    <span>{user.name || user.login}</span>
                    <a 
                      href={user.html_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-[#8b949e] hover:text-[#58a6ff]"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-[10px] text-[#8b949e] leading-none flex items-center gap-2 mt-0.5">
                    <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {user.followers} followers</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><BookMarked className="w-3 h-3" /> {user.public_repos} repos</span>
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                id="header-logout-btn"
                onClick={handleLogout}
                className="p-2.5 bg-[#21262d] hover:bg-red-950/40 border border-[#30363d] hover:border-red-900/50 rounded-xl transition-all text-[#8b949e] hover:text-red-400 cursor-pointer flex items-center gap-1.5"
                title="Disconnect Account"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline text-xs font-semibold">Disconnect</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedRepo ? (
            /* Repository List View in Bento Grid style */
            <motion.div
              key="repos-view"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Bento Grid layout containing the widgets and profile */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                
                {/* Column 1: Bento Profile & Scope details */}
                <div className="lg:col-span-1 space-y-4">
                  {/* Bento Profile Card */}
                  {user && (
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 to-purple-500" />
                      <div className="w-20 h-20 rounded-full border-2 border-[#30363d] p-1 mb-4 overflow-hidden relative">
                        <img
                          src={user.avatar_url}
                          alt={user.login}
                          className="w-full h-full rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <h2 className="text-base font-bold text-white mb-1 tracking-tight flex items-center gap-1">
                        <span>{user.name || user.login}</span>
                        <a 
                          href={user.html_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[#8b949e] hover:text-[#58a6ff] transition-all"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </h2>
                      <p className="text-xs text-[#8b949e] mb-4 italic text-balance font-medium">
                        {user.bio || "Building modular systems for the open web."}
                      </p>

                      {/* Micro Stats Row */}
                      <div className="w-full flex justify-between px-2 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl">
                        <div className="text-center flex-1">
                          <span className="block text-white font-extrabold text-xs">{user.followers}</span>
                          <span className="text-[8px] uppercase font-semibold text-[#8b949e] tracking-wider">Followers</span>
                        </div>
                        <div className="text-center border-x border-[#30363d] px-2 flex-1">
                          <span className="block text-[#58a6ff] font-extrabold text-xs">
                            {repos.reduce((acc, r) => acc + r.stargazers_count, 0)}
                          </span>
                          <span className="text-[8px] uppercase font-semibold text-[#8b949e] tracking-wider">Stars</span>
                        </div>
                        <div className="text-center flex-1">
                          <span className="block text-[#2ea44f] font-extrabold text-xs">{user.public_repos}</span>
                          <span className="text-[8px] uppercase font-semibold text-[#8b949e] tracking-wider">Repos</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Scopes Grid Card */}
                  <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 space-y-4 shadow-md">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-[#2ea44f] rounded-full animate-pulse" />
                      <span>Active Scope Grants</span>
                    </h3>
                    <div className="space-y-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 bg-[#238636] rounded-full" />
                        <div className="text-xs text-[#c9d1d9] font-medium">Read:User (Profile info)</div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 bg-[#238636] rounded-full" />
                        <div className="text-xs text-[#c9d1d9] font-medium">Read:Org (Organizations)</div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 bg-[#238636] rounded-full" />
                        <div className="text-xs text-[#c9d1d9] font-medium">Repo (Access code trees)</div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-1.5 bg-[#8b949e]/30 rounded-full" />
                        <div className="text-xs text-[#8b949e] italic">Delete:Repo (Disabled)</div>
                      </div>
                    </div>
                    <hr className="border-[#30363d]" />
                    <div className="text-[10px] text-[#8b949e] leading-relaxed">
                      This token runs in secure server-side isolation, protected against browser leaks.
                    </div>
                  </div>
                </div>

                {/* Column 2: Graph widgets & codebases */}
                <div className="lg:col-span-3 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sync History graph widget */}
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex flex-col justify-between shadow-md">
                      <div>
                        <h3 className="text-xs font-bold uppercase text-[#8b949e] tracking-wider mb-3">Sync History</h3>
                        <div className="flex gap-1.5 h-14 items-end">
                          <div className="flex-1 bg-[#238636]/30 rounded-sm h-[30%]" title="30% activity" />
                          <div className="flex-1 bg-[#238636]/50 rounded-sm h-[50%]" />
                          <div className="flex-1 bg-[#238636]/70 rounded-sm h-[80%]" />
                          <div className="flex-1 bg-[#238636]/40 rounded-sm h-[40%]" />
                          <div className="flex-1 bg-[#238636] rounded-sm h-[100%]" />
                          <div className="flex-1 bg-[#238636]/60 rounded-sm h-[60%]" />
                          <div className="flex-1 bg-[#238636]/20 rounded-sm h-[20%]" />
                          <div className="flex-1 bg-[#238636]/55 rounded-sm h-[55%]" />
                          <div className="flex-1 bg-[#238636]/85 rounded-sm h-[85%]" />
                          <div className="flex-grow bg-[#238636] rounded-sm h-[95%]" />
                          <div className="flex-1 bg-[#238636]/30 rounded-sm h-[30%]" />
                          <div className="flex-1 bg-[#238636]/50 rounded-sm h-[50%]" />
                        </div>
                      </div>
                      <div className="flex justify-between mt-2.5 text-[9px] text-[#8b949e] font-mono">
                        <span>Jul 01</span>
                        <span>Today</span>
                      </div>
                    </div>

                    {/* Commit Velocity stats widget */}
                    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 flex flex-col justify-center shadow-md">
                      <span className="text-[10px] font-bold text-[#8b949e] uppercase mb-1 tracking-wider">Commit Velocity</span>
                      <div className="text-3xl font-extrabold text-white tracking-tight">+24.8%</div>
                      <div className="w-full h-1.5 bg-[#21262d] rounded-full mt-3.5 overflow-hidden">
                        <div className="w-3/4 h-full bg-[#238636] rounded-full" />
                      </div>
                      <span className="text-[10px] text-[#8b949e] mt-2">Active development surge detected.</span>
                    </div>
                  </div>

                  {/* Quick Webhooks Proxy action panel */}
                  <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-5 shadow-md">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-white">Proxy Access Webhook</h4>
                        <p className="text-xs text-[#8b949e]">Deploy and sync triggers safely behind secure authorization proxies.</p>
                      </div>
                      <div className="flex items-center gap-2 bg-[#0d1117] border border-[#30363d] px-3 py-2 rounded-xl text-[10px] font-mono text-[#79c0ff] max-w-full overflow-hidden shrink-0 select-all">
                        <span>https://api.github.com/events/772...</span>
                      </div>
                    </div>
                  </div>

                  {/* Active codebases list container */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b border-[#30363d] pb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                        <Layers className="w-4.5 h-4.5 text-[#58a6ff]" />
                        <span>Active Codebases</span>
                      </h3>

                      <button
                        id="refresh-repos-btn"
                        onClick={fetchRepos}
                        disabled={loadingRepos}
                        className="px-3 py-1.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-xl text-xs font-semibold text-[#8b949e] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                        title="Refresh Repositories Feed"
                      >
                        <Activity className={`w-3.5 h-3.5 ${loadingRepos ? "animate-spin" : ""}`} />
                        <span>Sync feeds</span>
                      </button>
                    </div>

                    {reposError && (
                      <div className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl text-red-400 text-xs flex items-center gap-2">
                        <span>{reposError}</span>
                      </div>
                    )}

                    <RepoList
                      repos={repos}
                      onSelectRepo={handleSelectRepo}
                      loading={loadingRepos}
                    />
                  </div>
                </div>

              </div>
            </motion.div>
          ) : (
            /* Selected Repository Explorer View */
            <motion.div
              key="explorer-view"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <RepoExplorer
                repo={selectedRepo}
                onBack={handleBackToRepos}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Persistent platform footer */}
      <footer className="bg-[#161b22] border-t border-[#30363d] py-4 text-center text-xs text-[#8b949e] shrink-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono">
          <span>Connected with GitHub securely using OAuth popups</span>
          <span>© 2026 GitHub Explorer Console</span>
        </div>
      </footer>
    </div>
  );
}
