import { useState, useEffect } from "react";
import { Github, Key, AlertTriangle, ExternalLink, CheckCircle2, ChevronRight, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [checkingConfig, setCheckingConfig] = useState(true);

  // Determine redirect URI
  const callbackUrl = typeof window !== "undefined"
    ? `${window.location.origin}/auth/callback`
    : "";

  // Copy callback URL helper
  const copyToClipboard = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Start popup-based OAuth
  const handleConnect = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/url");
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to retrieve GitHub authorization URL.");
      }

      const { url } = await response.json();

      // Open popup centered
      const width = 600;
      const height = 750;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        url,
        "github_oauth_popup",
        `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
      );

      if (!popup) {
        throw new Error("Popup blocked! Please allow popups for this site to complete GitHub authentication.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during login.");
      setLoading(false);
    }
  };

  // Fetch configuration status from backend on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch("/api/auth/config");
        if (res.ok) {
          const data = await res.json();
          setIsConfigured(data.configured);
          if (!data.configured) {
            setError("GITHUB_CLIENT_ID environment variable is not configured. Please add your GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET variables in the Secrets panel in the AI Studio UI.");
            setShowHelp(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch auth config", err);
      } finally {
        setCheckingConfig(false);
      }
    };
    fetchConfig();
  }, []);

  // Listen for message from popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin matches current window origin
      if (event.origin !== window.location.origin) {
        return;
      }

      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        setLoading(false);
        onLoginSuccess();
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onLoginSuccess]);

  return (
    <div id="login-screen-container" className="min-h-screen flex flex-col items-center justify-center bg-[#0d1117] p-4 font-sans text-[#c9d1d9] selection:bg-[#58a6ff]/30">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500" />
      
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-xl bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header/Banner */}
        <div className="p-8 bg-gradient-to-b from-[#1f242c] to-[#161b22] border-b border-[#30363d] text-center relative">
          <div className="w-16 h-16 bg-[#21262d] border border-[#30363d] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-md text-white">
            <Github className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            GitHub Explorer
          </h1>
          <p className="text-sm text-[#8b949e] max-w-sm mx-auto">
            Securely authorize and inspect your GitHub repositories, branches, file structures, and issues in one unified console.
          </p>
        </div>

        <div className="p-8 space-y-6">
          {/* Status/Error Messages */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-950/40 border border-red-800/60 rounded-xl p-4 flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <span className="font-semibold text-red-200">Connection Failed</span>
                  <p className="text-red-300/90 mt-1">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Button */}
          <div className="flex flex-col items-center">
            <button
              id="github-connect-btn"
              onClick={handleConnect}
              disabled={loading || isConfigured === false}
              className={`w-full py-3.5 px-6 rounded-xl font-medium text-white shadow-lg transition-all flex items-center justify-center gap-3 cursor-pointer ${
                loading || isConfigured === false
                  ? "bg-[#21262d] border border-[#30363d] text-[#8b949e] cursor-not-allowed"
                  : "bg-[#2ea44f] hover:bg-[#2c974b] active:scale-[0.98]"
              }`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#8b949e] border-t-white rounded-full animate-spin" />
                  <span>Connecting to GitHub...</span>
                </>
              ) : isConfigured === false ? (
                <>
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                  <span>Configure GitHub Credentials</span>
                </>
              ) : (
                <>
                  <Github className="w-5 h-5" />
                  <span>Connect with GitHub</span>
                </>
              )}
            </button>
            <p className="text-xs text-[#8b949e] mt-3 flex items-center gap-1">
              <span>Uses standard GitHub OAuth flow for secure authorization.</span>
            </p>
          </div>

          <hr className="border-[#30363d]" />

          {/* Setup / Configuration Panel */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                id="toggle-help-btn"
                onClick={() => setShowHelp(!showHelp)}
                className="text-xs text-[#58a6ff] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-4 h-4" />
                <span>{showHelp ? "Hide Configuration Steps" : "First time? Show OAuth Setup Steps"}</span>
              </button>
            </div>

            <AnimatePresence>
              {(showHelp || !error) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Key className="w-4 h-4 text-[#58a6ff]" />
                      <span>Configure GitHub Developer App</span>
                    </h3>
                    
                    <div className="space-y-3 text-xs text-[#8b949e] leading-relaxed">
                      <p>
                        To enable connection, you must register a GitHub OAuth app and configure the secrets in AI Studio:
                      </p>
                      
                      <ol className="list-decimal list-inside space-y-2.5">
                        <li className="pl-1">
                          Open <a href="https://github.com/settings/developers" target="_blank" rel="noopener noreferrer" className="text-[#58a6ff] hover:underline inline-flex items-center gap-0.5">GitHub Developer Settings <ExternalLink className="w-3 h-3" /></a> and click <strong className="text-white">New OAuth App</strong>.
                        </li>
                        <li className="pl-1">
                          Set the <strong className="text-white">Authorization callback URL</strong> to:
                          <div className="mt-1.5 flex items-center gap-1.5 bg-[#161b22] border border-[#30363d] p-2 rounded-lg font-mono text-[#58a6ff] overflow-x-auto">
                            <span className="truncate select-all">{callbackUrl}</span>
                            <button
                              id="copy-callback-url-btn"
                              onClick={copyToClipboard}
                              className="ml-auto p-1 text-[#8b949e] hover:text-white rounded-md bg-[#21262d] hover:bg-[#30363d] transition-all cursor-pointer"
                              title="Copy URL"
                            >
                              {copied ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </li>
                        <li className="pl-1">
                          Generate a <strong className="text-white">Client Secret</strong> inside your new GitHub App.
                        </li>
                        <li className="pl-1">
                          Configure these two environment variables inside the <strong className="text-white">Secrets/Environment Variables Panel</strong> in AI Studio:
                          <div className="mt-1.5 bg-[#161b22] border border-[#30363d] p-2 rounded-lg font-mono text-white text-[10px] space-y-1">
                            <div>GITHUB_CLIENT_ID=<span className="text-yellow-500">&lt;Your Client ID&gt;</span></div>
                            <div>GITHUB_CLIENT_SECRET=<span className="text-yellow-500">&lt;Your Client Secret&gt;</span></div>
                          </div>
                        </li>
                      </ol>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Footer info */}
        <div className="px-8 py-4 bg-[#161b22] border-t border-[#30363d] text-center text-xs text-[#8b949e]">
          Your GitHub credentials are never shared or sent to any server other than GitHub.
        </div>
      </motion.div>
    </div>
  );
}
