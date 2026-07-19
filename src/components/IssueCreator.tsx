import React, { useState, useEffect } from "react";
import { GitHubRepo, GitHubIssue } from "../types";
import { 
  AlertCircle, CheckCircle2, MessageSquare, Plus, Send, 
  ExternalLink, ChevronDown, Check, CornerDownRight, PlusCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface IssueCreatorProps {
  repo: GitHubRepo;
}

export default function IssueCreator({ repo }: IssueCreatorProps) {
  const [issues, setIssues] = useState<GitHubIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form State
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const owner = repo.full_name.split("/")[0];

  // Fetch Issues
  const fetchIssues = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/github/issues?owner=${owner}&repo=${repo.name}`);
      if (!res.ok) throw new Error("Failed to load repository issues.");
      const data = await res.json();
      setIssues(data);
    } catch (err: any) {
      setError(err.message || "An error occurred while loading issues.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIssues();
  }, [repo]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/github/issues?owner=${owner}&repo=${repo.name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title, body }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create issue.");
      }

      // Success
      setTitle("");
      setBody("");
      setShowForm(false);
      setSuccessMsg("Issue created successfully!");
      setTimeout(() => setSuccessMsg(null), 4000);
      
      // Refresh issues list
      fetchIssues();
    } catch (err: any) {
      setError(err.message || "Could not create the issue. Ensure you have proper permissions.");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div id="issue-creator-component" className="space-y-6">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-[#58a6ff]" />
          <span>Issues Feed ({issues.length})</span>
        </h3>

        <button
          id="toggle-issue-form-btn"
          onClick={() => {
            setShowForm(!showForm);
            setError(null);
          }}
          className="px-3.5 py-2 bg-[#2ea44f] hover:bg-[#2c974b] rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
        >
          {showForm ? (
            <span>Close Editor</span>
          ) : (
            <>
              <PlusCircle className="w-4 h-4" />
              <span>Create Issue</span>
            </>
          )}
        </button>
      </div>

      {/* Messages */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-green-950/20 border border-green-900/40 rounded-xl text-green-400 text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-4 bg-red-950/20 border border-red-900/40 rounded-xl text-red-400 text-xs flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Issue Form */}
      {showForm && (
        <motion.form
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          id="new-issue-form"
          onSubmit={handleSubmit}
          className="bg-[#161b22] border border-[#30363d] rounded-xl p-5 space-y-4 shadow-md"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-white pb-2 border-b border-[#30363d]">
            <CornerDownRight className="w-4 h-4 text-[#58a6ff]" />
            <span>Open a new issue in {repo.name}</span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#8b949e]">Issue Title</label>
            <input
              id="issue-title-input"
              type="text"
              placeholder="e.g., Bug: File explorer fails to load"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs focus:outline-none focus:border-[#58a6ff] transition-all text-white"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#8b949e]">Description (Supports standard Markdown)</label>
            <textarea
              id="issue-body-textarea"
              placeholder="Provide a detailed description of the task or issue..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              className="w-full px-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-xl text-xs focus:outline-none focus:border-[#58a6ff] transition-all text-white font-mono resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              id="cancel-issue-btn"
              type="button"
              onClick={() => {
                setShowForm(false);
                setError(null);
              }}
              className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-xl text-xs font-semibold text-[#c9d1d9] transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="submit-issue-btn"
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-[#2ea44f] hover:bg-[#2c974b] rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition-all cursor-pointer active:scale-[0.98] disabled:bg-[#21262d] disabled:text-[#8b949e]"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit Issue</span>
                </>
              )}
            </button>
          </div>
        </motion.form>
      )}

      {/* Issues list */}
      {loading ? (
        <div className="py-12 text-center space-y-2">
          <div className="w-6 h-6 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin mx-auto" />
          <span className="text-xs text-[#8b949e]">Fetching repository issues...</span>
        </div>
      ) : issues.length === 0 ? (
        <div className="py-12 text-center bg-[#161b22] border border-[#30363d] rounded-xl space-y-2">
          <AlertCircle className="w-8 h-8 text-[#8b949e] mx-auto mb-1" />
          <h4 className="text-sm font-semibold text-white">No issues found</h4>
          <p className="text-xs text-[#8b949e] max-w-sm mx-auto">
            This repository has 0 issues logged. Click "Create Issue" to submit your first report!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {issues.map((issue) => (
            <div
              key={issue.id}
              id={`issue-item-${issue.number}`}
              className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl flex items-start justify-between gap-4 hover:border-[#8b949e]/30 transition-all shadow-sm"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border flex items-center gap-1 shrink-0 ${
                    issue.state === "open"
                      ? "bg-green-950/20 text-green-500 border-green-900/40"
                      : "bg-purple-950/20 text-purple-500 border-purple-900/40"
                  }`}>
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span className="capitalize">{issue.state}</span>
                  </span>
                  
                  <span className="text-xs font-mono font-bold text-[#8b949e]">#{issue.number}</span>
                  
                  <a
                    href={issue.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-[#c9d1d9] hover:text-[#58a6ff] hover:underline flex items-center gap-1.5 line-clamp-1 select-text"
                  >
                    <span>{issue.title}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#8b949e] inline shrink-0" />
                  </a>
                </div>

                <div className="text-[11px] text-[#8b949e] flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>Opened on {formatDate(issue.created_at)}</span>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <img
                      src={issue.user.avatar_url}
                      alt={issue.user.login}
                      className="w-3.5 h-3.5 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-[#c9d1d9] font-medium">{issue.user.login}</span>
                  </div>
                </div>
              </div>

              {/* Comments counter */}
              {issue.comments > 0 && (
                <div className="flex items-center gap-1 text-[11px] text-[#8b949e] shrink-0 bg-[#0d1117] border border-[#30363d] px-2.5 py-1 rounded-lg">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{issue.comments}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
