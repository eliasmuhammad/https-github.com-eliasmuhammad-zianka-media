import { useState, useEffect } from "react";
import { GitHubRepo, GitHubBranch, GitHubContentNode } from "../types";
import { 
  ArrowLeft, GitBranch, Folder, File, FileText, FileCode, FileImage, 
  ChevronRight, Copy, Check, Terminal, Info, AlertCircle, RefreshCw 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import IssueCreator from "./IssueCreator";
import RepoInsights from "./RepoInsights";

interface RepoExplorerProps {
  repo: GitHubRepo;
  onBack: () => void;
}

type ActiveTab = "code" | "issues" | "insights";

export default function RepoExplorer({ repo, onBack }: RepoExplorerProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("code");
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState(repo.default_branch);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [nodes, setNodes] = useState<GitHubContentNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<GitHubContentNode | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [loadingFile, setLoadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch branches on mount
  useEffect(() => {
    async function fetchBranches() {
      setLoadingBranches(true);
      try {
        const res = await fetch(`/api/github/branches?owner=${repo.full_name.split("/")[0]}&repo=${repo.name}`);
        if (!res.ok) throw new Error("Failed to load repository branches.");
        const data = await res.json();
        setBranches(data);
        // Ensure standard fallback
        if (data.length > 0 && !data.find((b: GitHubBranch) => b.name === repo.default_branch)) {
          setSelectedBranch(data[0].name);
        }
      } catch (err: any) {
        console.error("Error loading branches:", err);
      } finally {
        setLoadingBranches(false);
      }
    }
    fetchBranches();
  }, [repo]);

  // Fetch contents of current folder
  const fetchContents = async (path: string, branch: string) => {
    setLoadingContent(true);
    setSelectedFile(null);
    setFileContent(null);
    setError(null);
    try {
      const owner = repo.full_name.split("/")[0];
      const res = await fetch(`/api/github/contents?owner=${owner}&repo=${repo.name}&path=${encodeURIComponent(path)}&ref=${encodeURIComponent(branch)}`);
      if (!res.ok) throw new Error(`Failed to load folder structure for path: /${path}`);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        // Sort: directories first, then files alphabetically
        const sortedNodes = data.sort((a, b) => {
          if (a.type === "dir" && b.type !== "dir") return -1;
          if (a.type !== "dir" && b.type === "dir") return 1;
          return a.name.localeCompare(b.name);
        });
        setNodes(sortedNodes);
      } else {
        // Unexpectedly received a single file node
        handleFileClick(data);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred while loading folder contents.");
    } finally {
      setLoadingContent(false);
    }
  };

  useEffect(() => {
    if (activeTab === "code") {
      fetchContents(currentPath, selectedBranch);
    }
  }, [currentPath, selectedBranch, activeTab]);

  // Handle clicking on folder or file
  const handleNodeClick = (node: GitHubContentNode) => {
    if (node.type === "dir") {
      setCurrentPath(node.path);
    } else if (node.type === "file") {
      handleFileClick(node);
    }
  };

  // Fetch file content
  const handleFileClick = async (node: GitHubContentNode) => {
    setLoadingFile(true);
    setSelectedFile(node);
    setFileContent(null);
    setError(null);
    try {
      const owner = repo.full_name.split("/")[0];
      const res = await fetch(`/api/github/contents?owner=${owner}&repo=${repo.name}&path=${encodeURIComponent(node.path)}&ref=${encodeURIComponent(selectedBranch)}`);
      if (!res.ok) throw new Error(`Failed to fetch file content: ${node.name}`);
      const data = await res.json();
      
      setFileContent(data.decodedContent || "No readable text content.");
    } catch (err: any) {
      setError(err.message || "Unable to read file content.");
    } finally {
      setLoadingFile(false);
    }
  };

  // Breadcrumb navigation
  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setCurrentPath("");
    } else {
      const parts = currentPath.split("/");
      const newPath = parts.slice(0, index + 1).join("/");
      setCurrentPath(newPath);
    }
  };

  // Copy helper
  const copyFileToClipboard = () => {
    if (fileContent) {
      navigator.clipboard.writeText(fileContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Render proper file icon based on extension
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (!ext) return <File className="w-4 h-4 text-[#8b949e]" />;
    
    const imageExtensions = ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"];
    if (imageExtensions.includes(ext)) {
      return <FileImage className="w-4 h-4 text-emerald-400" />;
    }

    const codeExtensions = ["ts", "tsx", "js", "jsx", "json", "py", "java", "go", "rs", "cpp", "c", "sh", "html", "css", "yaml", "yml"];
    if (codeExtensions.includes(ext)) {
      return <FileCode className="w-4 h-4 text-sky-400" />;
    }

    const textExtensions = ["md", "txt", "log", "lock"];
    if (textExtensions.includes(ext)) {
      return <FileText className="w-4 h-4 text-amber-400" />;
    }

    return <File className="w-4 h-4 text-[#8b949e]" />;
  };

  // Format file size
  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div id="repo-explorer" className="space-y-6">
      {/* Back Button and Repository Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#30363d] pb-5">
        <div className="flex items-center gap-3">
          <button
            id="back-to-repos-btn"
            onClick={onBack}
            className="p-2.5 bg-[#161b22] hover:bg-[#21262d] border border-[#30363d] rounded-xl transition-all text-[#8b949e] hover:text-white cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white tracking-tight">{repo.name}</h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                repo.private 
                  ? "bg-amber-950/20 text-amber-500 border-amber-900/40" 
                  : "bg-green-950/20 text-green-500 border-green-900/40"
              }`}>
                {repo.private ? "Private" : "Public"}
              </span>
            </div>
            <p className="text-xs text-[#8b949e] mt-1">{repo.description || "No description provided."}</p>
          </div>
        </div>

        {/* Branch Selector */}
        {activeTab === "code" && (
          <div className="flex items-center gap-2 bg-[#161b22] border border-[#30363d] rounded-xl px-3 py-1.5 self-start md:self-auto">
            <GitBranch className="w-4 h-4 text-[#8b949e]" />
            {loadingBranches ? (
              <span className="text-xs text-[#8b949e]">Loading branches...</span>
            ) : (
              <select
                id="branch-selector"
                value={selectedBranch}
                onChange={(e) => {
                  setSelectedBranch(e.target.value);
                  setCurrentPath("");
                }}
                className="bg-transparent border-none text-xs font-semibold text-[#c9d1d9] focus:outline-none cursor-pointer pr-4"
              >
                {branches.map((b) => (
                  <option key={b.name} value={b.name} className="bg-[#161b22] text-[#c9d1d9]">
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Primary Explorer Navigation Tabs - Bento style */}
      <div className="bg-[#161b22] border border-[#30363d] p-1.5 rounded-xl flex items-center gap-1 max-w-sm shrink-0 shadow-sm">
        {(["code", "issues", "insights"] as const).map((tab) => (
          <button
            key={tab}
            id={`tab-${tab}`}
            onClick={() => {
              setActiveTab(tab);
              setError(null);
            }}
            className={`flex-1 text-center py-1.5 px-3.5 text-xs font-bold rounded-lg border transition-all capitalize cursor-pointer ${
              activeTab === tab
                ? "bg-[#21262d] border-[#30363d] text-white shadow-sm"
                : "border-transparent text-[#8b949e] hover:text-white hover:bg-[#21262d]/40"
            }`}
          >
            {tab === "code" ? "Code" : tab === "issues" ? "Issues" : "Insights"}
          </button>
        ))}
      </div>

      {/* Tabs Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "code" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* File Explorer (Left Panel: 4 cols or full width if no file selected) */}
              <div className={`${selectedFile ? "lg:col-span-4" : "lg:col-span-12"} space-y-4`}>
                {/* Navigation and Breadcrumbs */}
                <div className="bg-[#161b22] border border-[#30363d] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-1 text-xs font-medium text-[#8b949e] overflow-x-auto pb-1">
                    <button
                      id="breadcrumb-root"
                      onClick={() => navigateToBreadcrumb(-1)}
                      className="hover:text-[#58a6ff] hover:underline shrink-0 cursor-pointer"
                    >
                      {repo.name}
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                    {currentPath.split("/").map((part, index, array) => {
                      if (!part) return null;
                      const isLast = index === array.length - 1;
                      return (
                        <div key={index} className="flex items-center gap-1 shrink-0">
                          <button
                            id={`breadcrumb-${index}`}
                            disabled={isLast}
                            onClick={() => navigateToBreadcrumb(index)}
                            className={`${
                              isLast ? "text-[#c9d1d9] font-semibold" : "hover:text-[#58a6ff] hover:underline"
                            } cursor-pointer`}
                          >
                            {part}
                          </button>
                          {!isLast && <ChevronRight className="w-3.5 h-3.5 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>

                  {/* Nodes list */}
                  <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                    {loadingContent ? (
                      <div className="py-12 text-center space-y-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#8b949e] mx-auto" />
                        <span className="text-xs text-[#8b949e]">Loading path nodes...</span>
                      </div>
                    ) : nodes.length === 0 ? (
                      <p className="text-xs text-[#8b949e] text-center py-6">This folder is empty.</p>
                    ) : (
                      <>
                        {/* Up directory button */}
                        {currentPath && (
                          <button
                            id="navigate-up-dir-btn"
                            onClick={() => {
                              const parts = currentPath.split("/");
                              parts.pop();
                              setCurrentPath(parts.join("/"));
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#8b949e] hover:text-[#58a6ff] rounded-lg hover:bg-[#21262d] transition-all text-left cursor-pointer"
                          >
                            <Folder className="w-4 h-4 text-[#8b949e]" />
                            <span>.. (parent directory)</span>
                          </button>
                        )}
                        {/* List items */}
                        {nodes.map((node) => (
                          <button
                            key={node.sha}
                            id={`node-item-${node.name}`}
                            onClick={() => handleNodeClick(node)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                              selectedFile?.sha === node.sha
                                ? "bg-[#1f242c] border-l-2 border-[#f78166] text-[#58a6ff]"
                                : "hover:bg-[#21262d] hover:text-white text-[#c9d1d9]"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              {node.type === "dir" ? (
                                <Folder className="w-4 h-4 text-[#58a6ff]" />
                              ) : (
                                getFileIcon(node.name)
                              )}
                              <span className="truncate">{node.name}</span>
                            </div>
                            {node.type === "file" && (
                              <span className="text-[10px] text-[#8b949e]">{formatSize(node.size)}</span>
                            )}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Code Viewer (Right Panel: 8 cols) */}
              {selectedFile && (
                <div className="lg:col-span-8 space-y-4">
                  <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden flex flex-col shadow-lg">
                    {/* File Header */}
                    <div className="bg-[#1f242c] border-b border-[#30363d] p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getFileIcon(selectedFile.name)}
                        <span className="text-xs font-semibold text-[#c9d1d9]">{selectedFile.name}</span>
                        <span className="text-[10px] text-[#8b949e] bg-[#21262d] px-2 py-0.5 rounded-full border border-[#30363d]">
                          {formatSize(selectedFile.size)}
                        </span>
                      </div>
                      
                      {fileContent && (
                        <button
                          id="copy-code-btn"
                          onClick={copyFileToClipboard}
                          className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] hover:border-[#8b949e]/30 rounded-lg text-xs font-medium text-[#c9d1d9] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
                        >
                          {copied ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-green-500" />
                              <span className="text-green-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* File Body */}
                    <div className="p-4 bg-[#0d1117] overflow-x-auto min-h-[300px] max-h-[600px] font-mono text-xs text-[#c9d1d9]">
                      {loadingFile ? (
                        <div className="py-20 text-center space-y-3">
                          <div className="w-8 h-8 border-2 border-[#30363d] border-t-[#58a6ff] rounded-full animate-spin mx-auto" />
                          <p className="text-xs text-[#8b949e]">Fetching file content...</p>
                        </div>
                      ) : error ? (
                        <div className="p-6 text-center space-y-2">
                          <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
                          <h4 className="text-sm font-semibold text-white">Error reading file</h4>
                          <p className="text-xs text-[#8b949e]">{error}</p>
                        </div>
                      ) : selectedFile.name.split(".").pop()?.toLowerCase() === "md" && fileContent ? (
                        /* Render Markdown files cleanly */
                        <div className="p-4 prose prose-invert max-w-none font-sans space-y-4 select-text">
                          <div className="flex items-center gap-1.5 bg-blue-950/20 border border-blue-900/40 p-3 rounded-lg text-[#58a6ff] mb-4">
                            <Info className="w-4 h-4 shrink-0" />
                            <span className="text-[11px] font-medium">Viewing formatted README reader</span>
                          </div>
                          <div className="whitespace-pre-wrap text-sm leading-relaxed text-[#c9d1d9]">
                            {fileContent}
                          </div>
                        </div>
                      ) : ["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(selectedFile.name.split(".").pop()?.toLowerCase() || "") ? (
                        /* Render Image assets */
                        <div className="py-12 text-center space-y-4">
                          <div className="max-w-[200px] mx-auto bg-[#161b22] p-2 rounded-xl border border-[#30363d]">
                            <img
                              src={selectedFile.download_url || ""}
                              alt={selectedFile.name}
                              className="max-h-[150px] mx-auto object-contain rounded"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <p className="text-xs text-[#8b949e]">Image preview loaded successfully from GitHub</p>
                        </div>
                      ) : (
                        /* Render standard code blocks with custom mock-line indexes */
                        <div className="flex select-text leading-relaxed">
                          {/* Line numbers column */}
                          <div className="text-right text-[#484f58] pr-4 select-none border-r border-[#21262d] shrink-0 text-[11px]">
                            {fileContent?.split("\n").map((_, i) => (
                              <div key={i}>{i + 1}</div>
                            )) || <div>1</div>}
                          </div>
                          {/* Code column */}
                          <pre className="pl-4 whitespace-pre text-[11px] overflow-x-auto text-[#c9d1d9] flex-1">
                            <code>{fileContent}</code>
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "issues" && (
            <IssueCreator repo={repo} />
          )}

          {activeTab === "insights" && (
            <RepoInsights repo={repo} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
