import { useState, useEffect, useMemo } from "react";
import { GitHubRepo, LanguageStats } from "../types";
import { 
  BarChart3, Database, Calendar, Eye, Star, GitFork, AlertCircle, Sparkles, RefreshCw
} from "lucide-react";
import { motion } from "motion/react";

interface RepoInsightsProps {
  repo: GitHubRepo;
}

export default function RepoInsights({ repo }: RepoInsightsProps) {
  const [languages, setLanguages] = useState<LanguageStats>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const owner = repo.full_name.split("/")[0];

  useEffect(() => {
    async function fetchLanguages() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/github/languages?owner=${owner}&repo=${repo.name}`);
        if (!res.ok) throw new Error("Failed to load language breakdown.");
        const data = await res.json();
        setLanguages(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Unable to fetch language statistics.");
      } finally {
        setLoading(false);
      }
    }
    fetchLanguages();
  }, [repo]);

  // Compute total code bytes and percentages
  const { totalBytes, languagesList } = useMemo(() => {
    const total = Object.values(languages).reduce((sum: number, val: number) => sum + val, 0) as number;
    const list = Object.entries(languages).map(([name, bytes]) => {
      const numBytes = bytes as number;
      const percent = total > 0 ? (numBytes / total) * 100 : 0;
      return {
        name,
        bytes: numBytes,
        percent: parseFloat(percent.toFixed(1)),
      };
    }).sort((a, b) => b.bytes - a.bytes);

    return { totalBytes: total, languagesList: list };
  }, [languages]);

  // Format Date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Convert KB to MB if necessary
  const formatRepoSize = (kb: number) => {
    if (kb < 1024) {
      return `${kb} KB`;
    }
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  // Language Dot Colors (mapped to match GitHub's styles roughly)
  const getLanguageColor = (lang: string) => {
    const colors: Record<string, string> = {
      JavaScript: "#f1e05a",
      TypeScript: "#3178c6",
      HTML: "#e34c26",
      CSS: "#563d7c",
      Python: "#3572A5",
      Java: "#b07219",
      Go: "#00ADD8",
      Rust: "#deeaff",
      C: "#555555",
      "C++": "#f34b7d",
      "C#": "#178600",
      Ruby: "#701516",
      PHP: "#4F5D95",
      Shell: "#89e051",
    };
    return colors[lang] || "#00f0ff";
  };

  return (
    <div id="repo-insights-component" className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-[#f78166]" />
        <h3 className="text-base font-semibold text-white">Repository Analytics</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Stats Panel */}
        <div className="md:col-span-2 space-y-6">
          {/* Bento-style Mini Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-[#8b949e] flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-yellow-500" /> Stars
              </span>
              <span className="text-xl font-extrabold text-white mt-2">{repo.stargazers_count}</span>
            </div>

            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-[#8b949e] flex items-center gap-1.5">
                <GitFork className="w-3.5 h-3.5 text-teal-400" /> Forks
              </span>
              <span className="text-xl font-extrabold text-white mt-2">{repo.forks_count}</span>
            </div>

            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-[#8b949e] flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-sky-400" /> Watchers
              </span>
              <span className="text-xl font-extrabold text-white mt-2">{repo.watchers_count}</span>
            </div>

            <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl flex flex-col justify-between">
              <span className="text-[10px] uppercase font-bold text-[#8b949e] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-red-400" /> Open Issues
              </span>
              <span className="text-xl font-extrabold text-white mt-2">{repo.open_issues_count}</span>
            </div>
          </div>

          {/* Languages breakdown card */}
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-purple-400" /> Language Distribution
            </h4>

            {loading ? (
              <div className="py-8 text-center">
                <RefreshCw className="w-5 h-5 animate-spin text-[#8b949e] mx-auto mb-2" />
                <span className="text-xs text-[#8b949e]">Calculating languages...</span>
              </div>
            ) : error ? (
              <p className="text-xs text-[#8b949e]">{error}</p>
            ) : languagesList.length === 0 ? (
              <p className="text-xs text-[#8b949e] text-center py-4">No code languages detected in this repository.</p>
            ) : (
              <div className="space-y-5">
                {/* Visual unified bar graph */}
                <div className="w-full h-3.5 bg-[#0d1117] rounded-full overflow-hidden flex">
                  {languagesList.map((lang) => (
                    <div
                      key={lang.name}
                      style={{ 
                        width: `${lang.percent}%`, 
                        backgroundColor: getLanguageColor(lang.name) 
                      }}
                      title={`${lang.name}: ${lang.percent}%`}
                    />
                  ))}
                </div>

                {/* Legend and percentage list */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {languagesList.map((lang) => (
                    <div key={lang.name} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full" 
                          style={{ backgroundColor: getLanguageColor(lang.name) }} 
                        />
                        <span className="text-xs font-semibold text-[#c9d1d9]">{lang.name}</span>
                      </div>
                      <div className="text-[10px] text-[#8b949e] pl-4.5">
                        <span>{lang.percent}%</span>
                        <span className="mx-1">•</span>
                        <span>{formatRepoSize(Math.round(lang.bytes / 1024))}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Repository Metadata Panel */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#8b949e] flex items-center gap-1.5">
            <Database className="w-4 h-4 text-[#58a6ff]" /> Repository Details
          </h4>

          <div className="space-y-4 text-xs text-[#8b949e]">
            {/* Repo Size */}
            <div className="flex justify-between items-center py-2 border-b border-[#30363d]">
              <span>Storage Size</span>
              <strong className="text-white font-mono">{formatRepoSize(repo.size)}</strong>
            </div>

            {/* Default Branch */}
            <div className="flex justify-between items-center py-2 border-b border-[#30363d]">
              <span>Default Branch</span>
              <strong className="text-white font-mono bg-[#21262d] px-2 py-0.5 rounded-md border border-[#30363d]">
                {repo.default_branch}
              </strong>
            </div>

            {/* Created on */}
            <div className="flex justify-between items-start py-2 border-b border-[#30363d] gap-2">
              <span className="shrink-0 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Created</span>
              <strong className="text-white text-right">{formatDate(repo.created_at)}</strong>
            </div>

            {/* Updated on */}
            <div className="flex justify-between items-start py-2 border-b border-[#30363d] gap-2">
              <span className="shrink-0 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Last Updated</span>
              <strong className="text-white text-right">{formatDate(repo.updated_at)}</strong>
            </div>

            {/* Pushed on */}
            <div className="flex justify-between items-start py-2 gap-2">
              <span className="shrink-0 flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Last Pushed</span>
              <strong className="text-white text-right">{formatDate(repo.pushed_at)}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
