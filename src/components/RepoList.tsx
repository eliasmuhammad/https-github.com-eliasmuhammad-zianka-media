import { useState, useMemo } from "react";
import { GitHubRepo } from "../types";
import { Search, Star, GitFork, AlertCircle, BookOpen, Clock, Globe, Lock, ChevronRight, Filter } from "lucide-react";
import { motion } from "motion/react";

interface RepoListProps {
  repos: GitHubRepo[];
  onSelectRepo: (repo: GitHubRepo) => void;
  loading: boolean;
}

type SortOption = "updated" | "stars" | "forks" | "name" | "issues";

export default function RepoList({ repos, onSelectRepo, loading }: RepoListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("All");
  const [sortBy, setSortBy] = useState<SortOption>("updated");

  // Get unique languages list
  const languages = useMemo(() => {
    const langs = new Set<string>();
    repos.forEach((repo) => {
      if (repo.language) {
        langs.add(repo.language);
      }
    });
    return ["All", ...Array.from(langs)].sort();
  }, [repos]);

  // Filter and sort repos
  const filteredAndSortedRepos = useMemo(() => {
    return repos
      .filter((repo) => {
        const matchesSearch = repo.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
          (repo.description && repo.description.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesLanguage = selectedLanguage === "All" || repo.language === selectedLanguage;
        return matchesSearch && matchesLanguage;
      })
      .sort((a, b) => {
        if (sortBy === "updated") {
          return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
        }
        if (sortBy === "stars") {
          return b.stargazers_count - a.stargazers_count;
        }
        if (sortBy === "forks") {
          return b.forks_count - a.forks_count;
        }
        if (sortBy === "issues") {
          return b.open_issues_count - a.open_issues_count;
        }
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        return 0;
      });
  }, [repos, searchTerm, selectedLanguage, sortBy]);

  // Helper to format date
  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Language Dot Colors (mapped to match GitHub's styles roughly)
  const getLanguageColor = (lang: string | null) => {
    if (!lang) return "bg-gray-500";
    const colors: Record<string, string> = {
      JavaScript: "bg-yellow-400",
      TypeScript: "bg-blue-500",
      HTML: "bg-orange-600",
      CSS: "bg-purple-500",
      Python: "bg-blue-400",
      Java: "bg-red-500",
      Go: "bg-teal-400",
      Rust: "bg-orange-500",
      C: "bg-gray-600",
      "C++": "bg-pink-500",
      "C#": "bg-green-600",
      Ruby: "bg-red-600",
      PHP: "bg-indigo-400",
      Shell: "bg-green-500",
    };
    return colors[lang] || "bg-cyan-500";
  };

  return (
    <div id="repo-list-container" className="space-y-6">
      {/* Filters Toolbar */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-[#8b949e]" />
          <input
            id="search-repos-input"
            type="text"
            placeholder="Search repositories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-sm focus:outline-none focus:border-[#58a6ff] focus:ring-1 focus:ring-[#58a6ff] transition-all"
          />
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Language Dropdown */}
          <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-1">
            <Filter className="w-3.5 h-3.5 text-[#8b949e] mr-2" />
            <select
              id="language-select"
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-[#c9d1d9] focus:outline-none cursor-pointer py-1.5"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang} className="bg-[#161b22] text-[#c9d1d9]">
                  {lang === "All" ? "All Languages" : lang}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center bg-[#0d1117] border border-[#30363d] rounded-xl px-3 py-1">
            <span className="text-xs text-[#8b949e] mr-2">Sort:</span>
            <select
              id="sort-repos-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent border-none text-xs font-medium text-[#c9d1d9] focus:outline-none cursor-pointer py-1.5"
            >
              <option value="updated" className="bg-[#161b22]">Last Updated</option>
              <option value="stars" className="bg-[#161b22]">Stars</option>
              <option value="forks" className="bg-[#161b22]">Forks</option>
              <option value="name" className="bg-[#161b22]">Name (A-Z)</option>
              <option value="issues" className="bg-[#161b22]">Open Issues</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Repos */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin mx-auto" />
          <p className="text-sm text-[#8b949e]">Loading your repositories...</p>
        </div>
      ) : filteredAndSortedRepos.length === 0 ? (
        <div className="py-16 text-center bg-[#161b22] border border-[#30363d] rounded-xl space-y-2">
          <BookOpen className="w-10 h-10 text-[#8b949e] mx-auto mb-2" />
          <h3 className="text-base font-semibold text-white">No repositories found</h3>
          <p className="text-xs text-[#8b949e] max-w-sm mx-auto">
            Try adjusting your search criteria or language filter to explore other repositories.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAndSortedRepos.map((repo, idx) => (
            <motion.div
              key={repo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.03, 0.3) }}
              onClick={() => onSelectRepo(repo)}
              id={`repo-card-${repo.id}`}
              className="group p-5 bg-[#161b22] hover:bg-[#1f242c] border border-[#30363d] hover:border-[#8b949e]/30 rounded-xl transition-all shadow-sm cursor-pointer flex flex-col justify-between"
            >
              <div>
                {/* Repo Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-base font-semibold text-[#58a6ff] group-hover:underline truncate flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-[#8b949e] shrink-0" />
                    <span className="truncate">{repo.name}</span>
                  </h3>
                  
                  {/* Privacy Badge */}
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border flex items-center gap-1 ${
                    repo.private 
                      ? "bg-amber-950/20 text-amber-500 border-amber-900/40" 
                      : "bg-[#21262d] text-[#8b949e] border-[#30363d]"
                  }`}>
                    {repo.private ? (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Private</span>
                      </>
                    ) : (
                      <>
                        <Globe className="w-3 h-3" />
                        <span>Public</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-[#8b949e] line-clamp-2 mb-4 h-8 leading-relaxed">
                  {repo.description || "No description provided."}
                </p>
              </div>

              {/* Repo Stats / Footer */}
              <div className="flex items-center justify-between border-t border-[#30363d] pt-3 text-[11px] text-[#8b949e]">
                {/* Left Side: Language and Stars */}
                <div className="flex items-center gap-4">
                  {repo.language && (
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2.5 h-2.5 rounded-full ${getLanguageColor(repo.language)}`} />
                      <span className="text-[#c9d1d9] font-medium">{repo.language}</span>
                    </span>
                  )}
                  
                  {repo.stargazers_count > 0 && (
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                      <span>{repo.stargazers_count}</span>
                    </span>
                  )}

                  {repo.forks_count > 0 && (
                    <span className="flex items-center gap-1">
                      <GitFork className="w-3.5 h-3.5" />
                      <span>{repo.forks_count}</span>
                    </span>
                  )}

                  {repo.open_issues_count > 0 && (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                      <span>{repo.open_issues_count}</span>
                    </span>
                  )}
                </div>

                {/* Right Side: Updated info */}
                <span className="flex items-center gap-1 text-[10px]">
                  <Clock className="w-3 h-3 text-[#8b949e]" />
                  <span>{formatDate(repo.pushed_at)}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-[#30363d] group-hover:text-[#8b949e] ml-1 transition-colors" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
