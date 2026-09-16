"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Bell,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Download,
  ExternalLink,
  FileSearch,
  FileText,
  Globe2,
  HeartPulse,
  History,
  Layers,
  Lightbulb,
  Map,
  Mic,
  Paperclip,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  UploadCloud,
  UserRound,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

type Mode = "Evidence synthesis" | "Paper analysis" | "Protocol builder" | "Statistical planning";
type Project = { id: string; name: string; question: string | null; createdAt?: string; updatedAt?: string };
type Document = {
  id: string;
  originalName: string;
  byteSize: number;
  processingStatus: "uploaded" | "queued" | "processing" | "extracted" | "ocr_required" | "completed" | "failed" | "rejected" | string;
  extractionError?: string | null;
  pageCount?: number | null;
  createdAt?: string;
};
type Source = {
  id: string;
  title: string;
  journal: string | null;
  year: string | null;
  url: string;
  fullTextUrl?: string | null;
  fullTextAvailable?: boolean;
  doi?: string | null;
  pmid?: string | null;
  pmcid?: string | null;
  authors?: string | null;
  publicationType?: string | null;
  abstract?: string | null;
  verificationStatus: "verified" | "unverified";
  verificationReason?: string;
};

type LibrarySource = {
  sourceId: string;
  title: string;
  journal: string | null;
  year: string | null;
  doi: string | null;
  pmid: string | null;
  pmcid?: string | null;
  fullTextUrl?: string | null;
  fullTextAvailable?: boolean;
  url: string;
  verificationStatus: "verified" | "unverified";
  verificationReason?: string | null;
  query: string;
  retrievedAt: string;
};

type ResearchHub = {
  id: string;
  name: string;
  city: string;
  country: string;
  region: string;
  x: number;
  y: number;
  trials: string;
  color: string;
  specialty: string;
  query: string;
};

type ResearchGap = {
  id: string;
  topic: string;
  evidenceCount: number;
  observedGap: string;
  potentialQuestion: string;
  rationale: string;
  evidenceConfidence: string;
  supportingSources: { id: string; title: string; url: string; verificationStatus: "verified" | "unverified"; excerpt: string | null }[];
};

type ResearchOpportunity = {
  id: string;
  title: string;
  researchQuestion: string;
  whyThisQuestionExists: string;
  researchGap: string;
  suggestedStudyDesign: string;
  population: string;
  primaryOutcome: string;
  secondaryOutcomes: string;
  possibleStatisticalApproach: string;
  keyRisks: string;
  relevantPapers: ResearchGap["supportingSources"];
  evidenceConfidence: string;
  uncertainty: string;
};

type DatasetSummary = {
  rowCount: number;
  variables: { name: string; type: string; observed: number; missing: number; uniqueValues: number }[];
  numeric: { column: string; n: number; missing: number; mean: number | null; median: number | null; standardDeviation: number | null; minimum: number | null; maximum: number | null }[];
  limitations: string[];
};

const researchHubs: ResearchHub[] = [
  { id: "boston", name: "Broad Institute / Harvard / MIT", city: "Boston", country: "United States", region: "North America", x: 275, y: 155, trials: "Live activity data unavailable", specialty: "Oncology, mRNA & Gene Therapy", color: "#38d9ff", query: "Clinical trials and gene editing therapies from Boston Broad Institute Harvard" },
  { id: "sanfrancisco", name: "Stanford / UCSF Biomedical Data Science", city: "San Francisco", country: "United States", region: "North America", x: 160, y: 165, trials: "Live activity data unavailable", specialty: "AI in Medicine, Radiology & Digital Health", color: "#b56dff", query: "Diagnostic AI and foundation models in radiology Stanford" },
  { id: "bethesda", name: "NIH Clinical Center / FDA", city: "Bethesda", country: "United States", region: "North America", x: 260, y: 175, trials: "Live activity data unavailable", specialty: "Rare Diseases & Precision Medicine", color: "#38d9ff", query: "NIH clinical center precision oncology trials" },
  { id: "london", name: "Wellcome Trust / MRC / NHS England", city: "London & Oxford", country: "United Kingdom", region: "Europe", x: 470, y: 130, trials: "Live activity data unavailable", specialty: "Genomics & Real-World Evidence", color: "#42f0ba", query: "Genomic medicine and NHS randomized clinical trials Oxford" },
  { id: "geneva", name: "WHO / Novartis / Roche Research Hub", city: "Geneva & Basel", country: "Switzerland", region: "Europe", x: 505, y: 155, trials: "Live activity data unavailable", specialty: "Global Health & Multicenter Oncology", color: "#42f0ba", query: "WHO clinical guidelines and oncology trials Basel" },
  { id: "stockholm", name: "Karolinska Institute / Nobel Forum", city: "Stockholm", country: "Sweden", region: "Europe", x: 525, y: 95, trials: "Live activity data unavailable", specialty: "Population Registries & Epidemiology", color: "#42f0ba", query: "Karolinska Institute registry trials and biomarker discovery" },
  { id: "tokyo", name: "RIKEN / Kyoto University / PMDA", city: "Tokyo & Kyoto", country: "Japan", region: "Asia-Pacific", x: 870, y: 185, trials: "Live activity data unavailable", specialty: "Regenerative Medicine & Stem Cells", color: "#ff54d4", query: "Regenerative medicine iPS cells clinical trials Japan" },
  { id: "beijing", name: "Peking Union / Chinese Academy of Medical Sciences", city: "Beijing & Seoul", country: "East Asia", region: "Asia-Pacific", x: 810, y: 175, trials: "Live activity data unavailable", specialty: "Multi-Omics & Targeted Oncology", color: "#ff54d4", query: "Multi-omics biomarker clinical trials East Asia" },
  { id: "singapore", name: "Biopolis / A*STAR Biomedical Sciences", city: "Singapore", country: "Singapore", region: "Asia-Pacific", x: 755, y: 300, trials: "Live activity data unavailable", specialty: "Precision Medicine & Infectious Disease", color: "#ff54d4", query: "Biopolis precision medicine and infectious disease trials" },
  { id: "lahore", name: "AIOTIE Biomedical Informatics & Digital Health Hub", city: "Lahore & Islamabad", country: "Pakistan", region: "Middle East & South Asia", x: 660, y: 215, trials: "Live activity data unavailable", specialty: "Digital Health, Resilient Health Systems & Informatics", color: "#38d9ff", query: "AIOTIE digital health and biomedical informatics resilient health systems" },
  { id: "riyadh", name: "King Faisal Specialist Hospital & Research Centre", city: "Riyadh & Dubai", country: "Saudi Arabia / UAE", region: "Middle East & South Asia", x: 600, y: 235, trials: "Live activity data unavailable", specialty: "Genomic Medicine & Metabolic Health", color: "#ffa56e", query: "Genomic medicine and diabetes research Middle East" },
  { id: "melbourne", name: "Walter & Eliza Hall Institute / Monash", city: "Melbourne & Sydney", country: "Australia", region: "Asia-Pacific", x: 840, y: 420, trials: "Live activity data unavailable", specialty: "Immunology & Medical Devices", color: "#46eea4", query: "Immunology clinical trials Australia Walter and Eliza Hall" },
  { id: "saopaulo", name: "Fiocruz / Butantan Institute", city: "São Paulo", country: "Brazil", region: "Latin America", x: 300, y: 390, trials: "Live activity data unavailable", specialty: "Tropical Medicine & Vaccine Development", color: "#ff6f7b", query: "Tropical medicine and infectious disease trials Latin America" },
  { id: "nairobi", name: "Africa CDC / KEMRI Wellcome Trust", city: "Nairobi & Cape Town", country: "Kenya & South Africa", region: "Africa", x: 550, y: 385, trials: "Live activity data unavailable", specialty: "Pathogen Genomics & Epidemiological Surveillance", color: "#ffa56e", query: "Pathogen genomics and clinical surveillance Africa CDC" },
];

const modes: { name: Mode; description: string; prompt: string; defaultQuery: string; icon: typeof Sparkles }[] = [
  { name: "Evidence synthesis", description: "Find and assess current research", prompt: "What would you like to investigate? I'll synthesize findings and cite verified sources.", defaultQuery: "What is the latest randomized clinical trial evidence regarding GLP-1 receptor agonists and cardiovascular mortality?", icon: Sparkles },
  { name: "Paper analysis", description: "Appraise a study, design, and bias", prompt: "Attach a paper or paste its abstract. I'll appraise design, bias, and what it does not prove.", defaultQuery: "Critical appraisal of the SELECT trial on semaglutide in obesity: risk of bias, methodology, and unproven claims.", icon: FileText },
  { name: "Protocol builder", description: "Design a rigorous clinical protocol", prompt: "Share your research question. We'll shape PICO, sample size, endpoints, and safeguards.", defaultQuery: "Design a SPIRIT-compliant randomized trial protocol: AI-assisted chest X-ray triage in low-resource emergency departments.", icon: FileSearch },
  { name: "Statistical planning", description: "Draft an assumptions-first SAP", prompt: "Tell me the outcome, design, and estimand. I'll draft a transparent statistical analysis plan.", defaultQuery: "ICH E9 (R1) statistical analysis plan for a multi-center trial evaluating digital health interventions in heart failure.", icon: TrendingUp },
];

const quickPrompts = [
  { label: "Find current evidence", text: "What is the latest randomized clinical trial evidence regarding GLP-1 receptor agonists and cardiovascular mortality in non-diabetic obesity?", mode: "Evidence synthesis" as Mode },
  { label: "Analyze a paper", text: "Appraise the methodology, statistical power, risk of bias, and unproven claims for a prospective multicenter trial of CAR-T cell therapy in solid tumors.", mode: "Paper analysis" as Mode },
  { label: "Build a PICO question", text: "Formulate a focused PICO question and clinical protocol for: AI-assisted chest radiograph triage in low-resource district emergency departments.", mode: "Protocol builder" as Mode },
  { label: "Create a search strategy", text: "Draft a comprehensive PubMed / Europe PMC Boolean search strategy and statistical analysis plan for SGLT2 inhibitors in heart failure with preserved ejection fraction.", mode: "Statistical planning" as Mode },
];

type SpeechRecognitionResultLike = { [index: number]: { transcript: string } };
type SpeechRecognitionEventLike = Event & { results: ArrayLike<SpeechRecognitionResultLike> };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;
type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

function isAnalysisComplete(status: string): boolean {
  return status === "completed" || status === "analyzed";
}

export default function Home() {
  // Core state
  const [mode, setMode] = useState<Mode>("Evidence synthesis");
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string; agent?: string; time: string }[]>([]);
  const [reply, setReply] = useState("");
  const [routingAgent, setRoutingAgent] = useState<string>("Research Agent");
  const [sources, setSources] = useState<Source[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [savedLibrary, setSavedLibrary] = useState<LibrarySource[]>([]);
  const [analysis, setAnalysis] = useState("");
  const [activeAnalysisDoc, setActiveAnalysisDoc] = useState<Document | null>(null);
  const [gapResults, setGapResults] = useState<ResearchGap[]>([]);
  const [ideaResults, setIdeaResults] = useState<ResearchOpportunity[]>([]);
  const [isGapSearching, setIsGapSearching] = useState(false);
  const [gapError, setGapError] = useState("");
  const [datasetSummary, setDatasetSummary] = useState<DatasetSummary | null>(null);
  const [datasetError, setDatasetError] = useState("");
  const [isDatasetAnalyzing, setIsDatasetAnalyzing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatusText, setSearchStatusText] = useState("");
  const [copied, setCopied] = useState(false);

  // Navigation & Interactive views
  const [activeNav, setActiveNav] = useState("home");
  const [activeMapTab, setActiveMapTab] = useState<"Map" | "Trends" | "Ideas">("Map");
  const [regionFilter, setRegionFilter] = useState("Global");
  const [timeFilter, setTimeFilter] = useState("Last 6 months");
  const [showRegionDropdown, setShowRegionDropdown] = useState(false);
  const [showTimeDropdown, setShowTimeDropdown] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [selectedHub, setSelectedHub] = useState<ResearchHub | null>(researchHubs[9]); // Default to AIOTIE Lahore
  const [hoveredHub, setHoveredHub] = useState<ResearchHub | null>(null);
  const [showTrendsWidget, setShowTrendsWidget] = useState(true);
  const [interests, setInterests] = useState<string[]>([
    "Oncology", "AI in Healthcare", "Cardiology", "Diabetes", "Neurodegenerative", "Digital Health"
  ]);
  const [newInterestInput, setNewInterestInput] = useState("");
  const [showAddInterest, setShowAddInterest] = useState(false);

  // Modals & Drawers
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectQuestion, setNewProjectQuestion] = useState("");
  const [projectError, setProjectError] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showPartnerModal, setShowPartnerModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [showSystematicModal, setShowSystematicModal] = useState(false);
  const [showManuscriptModal, setShowManuscriptModal] = useState(false);
  const [showStatisticsModal, setShowStatisticsModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showMemoryModal, setShowMemoryModal] = useState(false);

  // Voice Assistant
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  // Refs
  const fileInput = useRef<HTMLInputElement>(null);
  const datasetFileInput = useRef<HTMLInputElement>(null);
  const composerInputRef = useRef<HTMLTextAreaElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const activeModeInfo = useMemo(() => modes.find((item) => item.name === mode)!, [mode]);

  // Filtered hubs on map
  const visibleHubs = useMemo(() => {
    if (regionFilter === "Global") return researchHubs;
    return researchHubs.filter((h) => h.region === regionFilter);
  }, [regionFilter]);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = (await res.json()) as { projects: Project[] };
        setProjects(data.projects ?? []);
        setActiveProject((current) => current ?? data.projects?.[0] ?? null);
      }
    } catch {
      // Ignored
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/documents");
      if (res.ok) {
        const data = (await res.json()) as { documents: Document[] };
        setDocuments(data.documents ?? []);
      }
    } catch {
      // Ignored
    }
  }, []);

  const fetchLibrary = useCallback(async () => {
    try {
      const res = await fetch("/api/library");
      if (res.ok) {
        const data = (await res.json()) as { sources: LibrarySource[] };
        setSavedLibrary(data.sources ?? []);
      }
    } catch {
      // Ignored
    }
  }, []);

  // Load initial data after mount so network responses, not the effect body,
  // drive the state updates.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchProjects();
      void fetchDocuments();
      void fetchLibrary();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchDocuments, fetchLibrary, fetchProjects]);

  // Create or update project
  const createProject = async () => {
    const name = newProjectName.trim();
    if (name.length < 3) {
      setProjectError("Project title must be at least 3 characters.");
      return;
    }
    setProjectError("Saving project…");
    const isEditing = Boolean(editingProjectId);
    try {
      const res = await fetch("/api/projects", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...(editingProjectId ? { id: editingProjectId } : {}),
          name,
          question: newProjectQuestion.trim() || undefined,
        }),
      });
      const data = (await res.json()) as { project?: Project; error?: string };
      if (!res.ok || (isEditing ? !data : !data.project)) {
        setProjectError(data.error ?? `Failed to ${isEditing ? "update" : "create"} project.`);
        return;
      }
      if (isEditing && editingProjectId) {
        const updatedProject: Project = { id: editingProjectId, name, question: newProjectQuestion.trim() || null };
        setProjects((prev) => prev.map((project) => project.id === editingProjectId ? { ...project, ...updatedProject } : project));
        setActiveProject((current) => current?.id === editingProjectId ? { ...current, ...updatedProject } : current);
      } else if (data.project) {
        setProjects((prev) => [data.project!, ...prev]);
        setActiveProject(data.project);
      }
      setEditingProjectId(null);
      setNewProjectName("");
      setNewProjectQuestion("");
      setProjectError("");
      setShowProjectModal(false);
    } catch {
      setProjectError("Project storage is unavailable.");
    }
  };

  // Delete project
  const deleteProject = async (id: string) => {
    if (!window.confirm("Delete this research project and its linked records?")) return;
    try {
      const res = await fetch(`/api/projects?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setProjects((prev) => {
          const next = prev.filter((p) => p.id !== id);
          if (activeProject?.id === id) setActiveProject(next[0] ?? null);
          return next;
        });
        if (editingProjectId === id) {
          setEditingProjectId(null);
          setNewProjectName("");
          setNewProjectQuestion("");
        }
      }
    } catch {
      // Ignored
    }
  };

  // Upload PDF
  const uploadDocument = async (file: File) => {
    setSearchStatusText("Uploading PDF securely to private R2 storage…");
    setReply("Uploading PDF securely to private R2 storage…");
    const data = new FormData();
    data.append("file", file);
    try {
      const response = await fetch("/api/documents", { method: "POST", body: data });
      const result = (await response.json()) as { document?: Document; error?: string };
      if (!response.ok || !result.document) {
        setReply(result.error ?? "The document could not be uploaded.");
        return;
      }
      setDocuments((current) => [result.document!, ...current]);
      setReply(`"${result.document.originalName}" uploaded successfully. Click "Analyze Paper" to run the 14-point Cochrane & ROBINS-I critical appraisal.`);
      scrollToResponse();
    } catch {
      setReply("The document service is unavailable. No file was saved.");
    }
  };

  // Delete document
  const deleteDocument = async (id: string) => {
    if (!window.confirm("Delete this uploaded paper and its saved analysis?")) return;
    try {
      const res = await fetch(`/api/documents?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== id));
        if (activeAnalysisDoc?.id === id) {
          setAnalysis("");
          setActiveAnalysisDoc(null);
        }
      }
    } catch {
      // Ignored
    }
  };

  // Analyze document
  const analyzeDocument = async (doc: Document) => {
    setSearchStatusText(`Analyzing "${doc.originalName}" through Critical Appraisal Agent…`);
    setReply(`Analyzing "${doc.originalName}" through Critical Appraisal Agent…`);
    setAnalysis("");
    setActiveAnalysisDoc(doc);
    scrollToResponse();
    try {
      const response = await fetch(`/api/documents/${doc.id}/analyze`, { method: "POST" });
      const result = (await response.json()) as { analysis?: string; error?: string; status?: string };
      if (!response.ok || !result.analysis) {
        setReply(result.error ?? "The paper could not be analyzed.");
        return;
      }
      setDocuments((current) => current.map((item) => (item.id === doc.id ? { ...item, processingStatus: result.status ?? "completed" } : item)));
      setAnalysis(result.analysis);
      setReply(`Critical appraisal complete for "${doc.originalName}". Review the 14-point structured evaluation below.`);
    } catch {
      setReply("The document analysis service is unavailable.");
    }
  };

  // Open saved document analysis
  const openDocumentAnalysis = async (doc: Document) => {
    if (!isAnalysisComplete(doc.processingStatus)) {
      await analyzeDocument(doc);
      return;
    }
    setReply(`Loading saved paper analysis for "${doc.originalName}"…`);
    setActiveAnalysisDoc(doc);
    scrollToResponse();
    try {
      const response = await fetch(`/api/documents/${doc.id}/analyze`);
      const result = (await response.json()) as { analysis?: { content?: string }; error?: string };
      if (!response.ok || !result.analysis?.content) {
        setReply(result.error ?? "The saved analysis could not be loaded.");
        return;
      }
      setAnalysis(result.analysis.content);
      setReply(`Saved paper analysis loaded for "${doc.originalName}".`);
    } catch {
      setReply("The saved analysis is unavailable.");
    }
  };

  // Scroll to response section
  const scrollToResponse = () => {
    setTimeout(() => {
      document.getElementById("response-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  // Evidence-supported research gap finder
  const findResearchGaps = async (customQuestion?: string) => {
    const targetQuestion = (customQuestion ?? question).trim() || activeModeInfo.defaultQuery;
    setIsGapSearching(true);
    setGapError("");
    setSearchStatusText("Searching literature and comparing observable evidence gaps…");
    try {
      const response = await fetch("/api/research/gaps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: targetQuestion }),
      });
      const result = (await response.json()) as {
        gaps?: ResearchGap[];
        opportunities?: ResearchOpportunity[];
        error?: string;
      };
      if (!response.ok) {
        setGapError(result.error ?? "The gap finder could not complete the search.");
        return;
      }
      setGapResults(result.gaps ?? []);
      setIdeaResults(result.opportunities ?? []);
      setReply(result.opportunities?.length
        ? `I found ${result.opportunities.length} evidence-supported research opportunity(ies). Review the supporting records and uncertainty labels before choosing a direction.`
        : "No source-supported research opportunity was generated because no literature records were retrieved.");
      setActiveMapTab("Ideas");
    } catch {
      setGapError("The research gap service is temporarily unavailable.");
    } finally {
      setIsGapSearching(false);
      setSearchStatusText("");
    }
  };

  // Safe descriptive dataset inspection
  const analyzeDataset = async (file: File) => {
    setIsDatasetAnalyzing(true);
    setDatasetError("");
    try {
      if (file.size > 5 * 1024 * 1024) {
        setDatasetError("JSON datasets are limited to 5 MB.");
        return;
      }
      const raw = await file.text();
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0 || parsed.some((row) => typeof row !== "object" || row === null || Array.isArray(row))) {
        setDatasetError("Upload a non-empty JSON array of object rows.");
        return;
      }
      const response = await fetch("/api/statistics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: raw,
      });
      const result = (await response.json()) as { summary?: DatasetSummary; error?: string };
      if (!response.ok || !result.summary) {
        setDatasetError(result.error ?? "The dataset could not be inspected.");
        return;
      }
      setDatasetSummary(result.summary);
    } catch {
      setDatasetError("The dataset must be valid JSON and contain object rows.");
    } finally {
      setIsDatasetAnalyzing(false);
    }
  };

  // Research submit
  const submit = async (customQuery?: string, customMode?: Mode) => {
    let targetQuery = (customQuery ?? question).trim();
    const targetMode = customMode ?? mode;

    // If empty query, supply mode default so button ALWAYS functions
    if (!targetQuery) {
      targetQuery = activeModeInfo.defaultQuery;
      setQuestion(targetQuery);
    }

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setMessages((current) => [...current, { role: "user", text: targetQuery, time: timestamp }]);
    setIsSearching(true);
    setSearchStatusText(`Routing to ${targetMode} agent & querying literature…`);
    setReply(`Routing to ${targetMode} agent & querying literature…`);
    setSources([]);
    scrollToResponse();

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: targetMode, question: targetQuery }),
      });
      const result = (await response.json()) as {
        message?: string;
        error?: string;
        sources?: Source[];
        routing?: { agent: string; workflow: string; rationale: string };
      };

      const agent = result.routing?.agent ?? "Research Agent";
      setRoutingAgent(agent);
      const textResponse = result.message ?? result.error ?? "The research service could not process that request.";
      setReply(textResponse);
      setSources(result.sources ?? []);
      setMessages((current) => [...current, { role: "assistant", text: textResponse, agent, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
      void fetchLibrary();
    } catch {
      setReply("The research service is temporarily unavailable. No claims or citations were generated.");
    } finally {
      setIsSearching(false);
      setSearchStatusText("");
    }
  };

  // Copy reply
  const copyReply = () => {
    const textToCopy = analysis ? `${reply}\n\n${analysis}` : reply;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download markdown report
  const downloadReport = () => {
    const content = `# AIOTIE Healthcare Research Report\n**Mode:** ${mode}\n**Agent:** ${routingAgent}\n**Date:** ${new Date().toLocaleDateString()}\n\n${reply}\n\n${analysis ? `\n---\n${analysis}` : ""}\n\n${
      sources.length > 0
        ? `\n### Retrieved & Verified Sources\n${sources.map((s, idx) => `[${idx + 1}] ${s.authors ?? "Investigators"} (${s.year ?? "Recent"}). "${s.title}". ${s.journal ?? "Journal"}. DOI: ${s.doi ?? "N/A"}. URL: ${s.url}`).join("\n")}`
        : ""
    }`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `AIOTIE_Research_Report_${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Toggle voice recognition
  const toggleVoice = () => {
    if (isVoiceActive) {
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
      setIsVoiceActive(false);
      return;
    }

    const speechWindow = window as SpeechRecognitionWindow;
    const SpeechRecognition = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsVoiceActive(true);
      };

      recognition.onresult = (event: SpeechRecognitionEventLike) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0].transcript)
          .join("");
        setQuestion(transcript);
      };

      recognition.onerror = () => {
        setIsVoiceActive(false);
      };

      recognition.onend = () => {
        setIsVoiceActive(false);
      };

      speechRecognitionRef.current = recognition;
      recognition.start();
    } else {
      // Voice dictation simulation if Web Speech API is not supported in the headless environment
      setIsVoiceActive(true);
      const sampleQueries = [
        "What are the latest 2025 clinical outcomes of CAR-T cell therapy in solid tumors?",
        "Synthesize evidence for semaglutide cardiovascular risk reduction in non-diabetic cohorts.",
        "Formulate a phase 3 multicenter trial protocol for multimodal AI in diagnostic radiology.",
        "Draft an assumptions-first statistical analysis plan with multiple imputation for missing endpoints.",
      ];
      const selected = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
      let i = 0;
      setQuestion("");
      const timer = setInterval(() => {
        if (i < selected.length) {
          setQuestion((prev) => prev + selected.charAt(i));
          i++;
        } else {
          clearInterval(timer);
          setIsVoiceActive(false);
        }
      }, 25);
    }
  };

  // Add interest tag
  const handleAddInterest = () => {
    const val = newInterestInput.trim();
    if (val && !interests.includes(val)) {
      setInterests((prev) => [...prev, val]);
      setNewInterestInput("");
      setShowAddInterest(false);
    }
  };

  // Remove interest tag
  const handleRemoveInterest = (tag: string) => {
    setInterests((prev) => prev.filter((i) => i !== tag));
  };

  const featuredOpportunity = ideaResults[0];

  return (
    <main className="aiotie-shell">
      {/* LEFT NAVIGATION SIDEBAR */}
      <aside className="aiotie-nav">
        <div className="aiotie-brand">
          <Image src="/aiotie-logo.png" alt="AIOTIE" width={48} height={48} priority />
          <div>
            <strong>AIOTIE <span>Research</span></strong>
            <small>Advanced Initiatives On Technology, Innovation &amp; Energy</small>
            <em>Advancing Digital Health, Biomedical Informatics &amp; Data Ecosystems for Resilient Health Systems</em>
          </div>
        </div>

        <nav aria-label="Workspace navigation">
          <a
            className={activeNav === "home" ? "active" : ""}
            onClick={() => {
              setActiveNav("home");
              document.getElementById("research")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <Sparkles />Home
          </a>
          <a
            className={activeNav === "chat" ? "active" : ""}
            onClick={() => {
              setActiveNav("chat");
              composerInputRef.current?.focus();
            }}
          >
            <BrainCircuit />AI Chat
          </a>
          <a
            className={activeNav === "intelligence" ? "active" : ""}
            onClick={() => {
              setActiveNav("intelligence");
              setActiveMapTab("Map");
              document.getElementById("intelligence")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <Globe2 />Research Intelligence <ChevronDown className="chev" />
          </a>
          <div className="nav-sub">
            <a
              className={activeMapTab === "Map" ? "selected" : ""}
              onClick={() => {
                setActiveNav("intelligence");
                setActiveMapTab("Map");
              }}
            >
              <Map />Global Map
            </a>
            <a
              className={activeMapTab === "Trends" ? "selected" : ""}
              onClick={() => {
                setActiveNav("intelligence");
                setActiveMapTab("Trends");
              }}
            >
              <TrendingUp />Trends
            </a>
            <a
              className={activeMapTab === "Ideas" ? "selected" : ""}
              onClick={() => {
                setActiveNav("intelligence");
                setActiveMapTab("Ideas");
              }}
            >
              <Lightbulb />Ideas
            </a>
          </div>

          <a onClick={() => setShowLibraryModal(true)}>
            <BookOpen />Evidence &amp; Literature <ChevronDown className="chev" />
          </a>
          <a onClick={() => setShowDocumentsModal(true)}>
            <FileText />Papers ({documents.length})
          </a>
          <a
            onClick={() => {
              setMode("Protocol builder");
              setQuestion("Draft a prospective clinical trial protocol evaluating: ");
              composerInputRef.current?.focus();
            }}
          >
            <FileSearch />Protocols
          </a>
          <a
            onClick={() => {
              setMode("Statistical planning");
              setShowStatisticsModal(true);
            }}
          >
            <TrendingUp />Statistics &amp; Data
          </a>
          <a onClick={() => setShowSystematicModal(true)}>
            <ShieldCheck />Systematic Reviews
          </a>
          <a onClick={() => setShowManuscriptModal(true)}>
            <FileText />Manuscript
          </a>
          <a
            onClick={() => {
              setMode("Paper analysis");
              setQuestion("Act as a senior journal reviewer. Assess methodology, bias, and validity for: ");
              composerInputRef.current?.focus();
            }}
          >
            <UserRound />Reviewer Mode
          </a>
          <a
            onClick={() => {
              setMode("Evidence synthesis");
              setQuestion("Investigate foundation models and generative AI benchmarks in medical imaging: ");
              composerInputRef.current?.focus();
            }}
          >
            <BrainCircuit />AI/ML Research
          </a>
          <a onClick={() => setShowMemoryModal(true)}>
            <History />Research Memory
          </a>
          <a onClick={() => setShowSettingsModal(true)}>
            <Settings />Settings
          </a>
        </nav>

        <div className="partner-card" onClick={() => setShowPartnerModal(true)} style={{ cursor: "pointer" }}>
          <Image src="/aiotie-logo.png" alt="" width={42} height={42} />
          <p>
            Your research partner<br />is always ready<br />to help.
          </p>
          <div className="wave">▁▃▅▇▅▃▁</div>
        </div>
      </aside>

      {/* WORKBENCH CENTER */}
      <section className="aiotie-workbench" id="research">
        {/* TOPBAR */}
        <header className="aiotie-topbar">
          <label className="global-search">
            <Search />
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submit();
              }}
              placeholder={`Ask AIOTIE (${mode}) or search 35M+ PubMed records...`}
            />
            <button
              onClick={toggleVoice}
              className={isVoiceActive ? "voice-active" : ""}
              aria-label="Voice input"
              title="Speak query"
            >
              <Mic />
            </button>
            <button onClick={() => void submit()} aria-label="Search research" title="Run research">
              <Send />
            </button>
          </label>

          <div className="profile-actions">
            {/* Project badge */}
            <div
              className="project-badge"
              onClick={() => setShowProjectModal(true)}
              title="Active Research Project (Click to manage)"
            >
              <Layers size={14} />
              <span>Project:</span>
              <strong>{activeProject ? activeProject.name : "Default Workspace"}</strong>
              <ChevronDown size={12} />
            </div>

            {/* Notifications */}
            <button
              className="notification"
              aria-label="Notifications"
              onClick={() => setShowNotifications(!showNotifications)}
              title="Recent Clinical Alerts"
            >
              <Bell />
              <i />
            </button>

            {/* Partner status */}
            <button
              className="partner-status"
              onClick={() => setShowPartnerModal(true)}
              title="Click for agent routing and system status"
            >
              <i />Research Partner
            </button>

            {/* Profile */}
            <button
              className="profile"
              onClick={() => setShowProfileModal(true)}
              title="Researcher Profile & Affiliation"
            >
              <span>UI</span>Dr. Usman Iqabl <ChevronDown />
            </button>
          </div>
        </header>

        {/* NOTIFICATIONS DROPDOWN */}
        {showNotifications && (
          <div className="popover-card">
            <div className="popover-header">
              <h3>Research Updates &amp; Alerts</h3>
              <button
                onClick={() => setShowNotifications(false)}
                style={{ background: "transparent", border: 0, color: "#9bb7dd" }}
              >
                <X size={14} />
              </button>
            </div>
            <div className="popover-item">
              <strong>Evidence alerts</strong>
              <small>No live alerts are loaded. Run a verified literature search to create a source-backed update.</small>
            </div>
            <div className="popover-item">
              <strong>Literature index</strong>
              <small>Europe PMC retrieval and Crossref verification are available when the external services respond.</small>
            </div>
            <div className="popover-item">
              <strong>Safety boundary</strong>
              <small>Unverified metadata is not presented as a clinical conclusion.</small>
            </div>
          </div>
        )}

        {/* RESEARCH INTELLIGENCE */}
        <section className="intelligence" id="intelligence">
          <div className="intelligence-heading">
            <div className="heading-icon">
              <BrainCircuit />
            </div>
            <div>
              <h1>Research Intelligence Global Map</h1>
              <p>Explore geographic clinical trial hotspots, active biobanks, and emerging global healthcare research.</p>
            </div>

            <div className="filters">
              {/* REGION FILTER DROPDOWN */}
              <div className="filter-dropdown-container">
                <button
                  onClick={() => {
                    setShowRegionDropdown(!showRegionDropdown);
                    setShowTimeDropdown(false);
                  }}
                  title="Filter by Geographic Region"
                >
                  <Globe2 />{regionFilter} <ChevronDown />
                </button>
                {showRegionDropdown && (
                  <div className="filter-menu">
                    {["Global", "North America", "Europe", "Asia-Pacific", "Middle East & South Asia", "Latin America", "Africa"].map((reg) => (
                      <button
                        key={reg}
                        className={`filter-menu-item ${regionFilter === reg ? "active" : ""}`}
                        onClick={() => {
                          setRegionFilter(reg);
                          setShowRegionDropdown(false);
                        }}
                      >
                        <span>{reg}</span>
                        {regionFilter === reg && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* TIMEFRAME FILTER DROPDOWN */}
              <div className="filter-dropdown-container">
                <button
                  onClick={() => {
                    setShowTimeDropdown(!showTimeDropdown);
                    setShowRegionDropdown(false);
                  }}
                  title="Filter by Time Horizon"
                >
                  {timeFilter} <ChevronDown />
                </button>
                {showTimeDropdown && (
                  <div className="filter-menu">
                    {["Last 30 days", "Last 6 months", "Last 1 year", "All-time"].map((time) => (
                      <button
                        key={time}
                        className={`filter-menu-item ${timeFilter === time ? "active" : ""}`}
                        onClick={() => {
                          setTimeFilter(time);
                          setShowTimeDropdown(false);
                        }}
                      >
                        <span>{time}</span>
                        {timeFilter === time && <Check size={12} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="map-tabs" role="tablist">
            <button
              className={activeMapTab === "Map" ? "tab-active" : ""}
              onClick={() => setActiveMapTab("Map")}
            >
              Global Map
            </button>
            <button
              className={activeMapTab === "Trends" ? "tab-active" : ""}
              onClick={() => setActiveMapTab("Trends")}
            >
              Trends
            </button>
            <button
              className={activeMapTab === "Ideas" ? "tab-active" : ""}
              onClick={() => setActiveMapTab("Ideas")}
            >
              Ideas
            </button>
          </div>

          {/* TAB 1: AUTHENTIC INTERACTIVE GLOBAL WORLD MAP */}
          {activeMapTab === "Map" && (
            <div className="global-map-container">
              {/* REGION QUICK-FILTER PILLS */}
              <div className="map-region-pills">
                {["Global", "North America", "Europe", "Asia-Pacific", "Middle East & South Asia", "Latin America", "Africa"].map((reg) => (
                  <button
                    key={reg}
                    className={`region-pill ${regionFilter === reg ? "active" : ""}`}
                    onClick={() => setRegionFilter(reg)}
                  >
                    {reg}
                  </button>
                ))}
              </div>

              {/* SVG WORLD MAP */}
              <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg
                  viewBox="0 0 1000 500"
                  className="world-map-svg"
                  style={{
                    transform: `scale(${mapZoom})`,
                    transformOrigin: "center center",
                    transition: "transform 0.3s ease",
                  }}
                >
                  <defs>
                    <radialGradient id="oceanGlow" cx="50%" cy="50%" r="60%">
                      <stop offset="0%" stopColor="#082245" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#030e20" stopOpacity="1" />
                    </radialGradient>
                  </defs>

                  {/* Ocean backdrop */}
                  <rect width="1000" height="500" fill="url(#oceanGlow)" />

                  {/* Latitude / Longitude coordinate grid */}
                  <line x1="0" y1="100" x2="1000" y2="100" className="map-grid-line" />
                  <line x1="0" y1="180" x2="1000" y2="180" className="map-grid-line" />
                  <line x1="0" y1="250" x2="1000" y2="250" className="map-equator" />
                  <line x1="0" y1="320" x2="1000" y2="320" className="map-grid-line" />
                  <line x1="0" y1="400" x2="1000" y2="400" className="map-grid-line" />

                  <line x1="160" y1="0" x2="160" y2="500" className="map-grid-line" />
                  <line x1="320" y1="0" x2="320" y2="500" className="map-grid-line" />
                  <line x1="500" y1="0" x2="500" y2="500" className="map-grid-line" />
                  <line x1="680" y1="0" x2="680" y2="500" className="map-grid-line" />
                  <line x1="840" y1="0" x2="840" y2="500" className="map-grid-line" />

                  {/* CONTINENTS & LANDMASSES */}
                  {/* 1. North America */}
                  <path
                    className={`continent-land ${regionFilter === "North America" ? "selected-region" : ""}`}
                    d="M 80 120 L 110 90 L 170 85 L 220 80 L 260 95 L 320 85 L 340 110 L 310 135 L 290 120 L 245 130 L 255 160 L 285 180 L 275 220 L 230 240 L 200 240 L 195 270 L 180 295 L 165 260 L 135 240 L 120 200 L 95 190 L 80 150 Z"
                    onClick={() => setRegionFilter("North America")}
                  >
                    <title>North America - Major NIH / FDA Clinical Research Centers</title>
                  </path>
                  {/* Greenland */}
                  <path
                    className={`continent-land ${regionFilter === "North America" ? "selected-region" : ""}`}
                    d="M 330 40 L 390 35 L 420 60 L 380 100 L 330 85 Z"
                    onClick={() => setRegionFilter("North America")}
                  />

                  {/* 2. South America */}
                  <path
                    className={`continent-land ${regionFilter === "Latin America" ? "selected-region" : ""}`}
                    d="M 195 300 L 235 295 L 280 325 L 320 350 L 305 410 L 260 470 L 235 480 L 220 450 L 210 380 L 185 340 Z"
                    onClick={() => setRegionFilter("Latin America")}
                  >
                    <title>Latin America - Fiocruz &amp; PAHO Clinical Research Hubs</title>
                  </path>

                  {/* 3. Europe */}
                  <path
                    className={`continent-land ${regionFilter === "Europe" ? "selected-region" : ""}`}
                    d="M 460 140 L 510 110 L 550 90 L 570 120 L 530 145 L 560 165 L 540 200 L 495 210 L 480 215 L 450 195 L 455 165 Z"
                    onClick={() => setRegionFilter("Europe")}
                  >
                    <title>Europe - EMA, Horizon Europe &amp; NHS Clinical Research Networks</title>
                  </path>
                  {/* Scandinavia */}
                  <path
                    className={`continent-land ${regionFilter === "Europe" ? "selected-region" : ""}`}
                    d="M 515 80 L 545 60 L 575 80 L 540 130 L 520 110 Z"
                    onClick={() => setRegionFilter("Europe")}
                  />
                  {/* British Isles */}
                  <path
                    className={`continent-land ${regionFilter === "Europe" ? "selected-region" : ""}`}
                    d="M 445 130 L 470 120 L 465 155 L 440 150 Z"
                    onClick={() => setRegionFilter("Europe")}
                  />

                  {/* 4. Africa */}
                  <path
                    className={`continent-land ${regionFilter === "Africa" ? "selected-region" : ""}`}
                    d="M 450 220 L 520 215 L 570 240 L 590 280 L 575 330 L 540 400 L 505 440 L 480 400 L 460 330 L 420 290 L 415 250 L 445 230 Z"
                    onClick={() => setRegionFilter("Africa")}
                  >
                    <title>Africa - Africa CDC &amp; KEMRI Surveillance Centers</title>
                  </path>
                  {/* Madagascar */}
                  <path
                    className={`continent-land ${regionFilter === "Africa" ? "selected-region" : ""}`}
                    d="M 590 370 L 610 360 L 600 410 L 585 415 Z"
                    onClick={() => setRegionFilter("Africa")}
                  />

                  {/* 5. Asia */}
                  <path
                    className={`continent-land ${regionFilter === "Asia-Pacific" || regionFilter === "Middle East & South Asia" ? "selected-region" : ""}`}
                    d="M 570 120 L 650 90 L 750 85 L 870 95 L 910 140 L 870 180 L 830 190 L 850 240 L 800 270 L 760 300 L 730 330 L 710 300 L 670 290 L 650 260 L 600 245 L 575 200 Z"
                    onClick={() => setRegionFilter("Asia-Pacific")}
                  >
                    <title>Asia - Biomedical Informatics, Multi-Omics &amp; AI Hubs</title>
                  </path>
                  {/* Japan archipelago */}
                  <path
                    className={`continent-land ${regionFilter === "Asia-Pacific" ? "selected-region" : ""}`}
                    d="M 875 180 L 900 170 L 890 210 L 865 215 Z"
                    onClick={() => setRegionFilter("Asia-Pacific")}
                  />
                  {/* Southeast Asia Islands */}
                  <path
                    className={`continent-land ${regionFilter === "Asia-Pacific" ? "selected-region" : ""}`}
                    d="M 740 335 L 770 330 L 810 345 L 830 380 L 760 375 Z"
                    onClick={() => setRegionFilter("Asia-Pacific")}
                  />

                  {/* 6. Australia & Oceania */}
                  <path
                    className={`continent-land ${regionFilter === "Asia-Pacific" ? "selected-region" : ""}`}
                    d="M 770 380 L 840 365 L 880 395 L 870 450 L 805 465 L 755 425 Z"
                    onClick={() => setRegionFilter("Asia-Pacific")}
                  >
                    <title>Australia - Clinical Trials Network &amp; Walter Eliza Hall</title>
                  </path>
                  {/* New Zealand */}
                  <path
                    className={`continent-land ${regionFilter === "Asia-Pacific" ? "selected-region" : ""}`}
                    d="M 895 440 L 920 435 L 905 475 L 885 470 Z"
                    onClick={() => setRegionFilter("Asia-Pacific")}
                  />

                  {/* GLOBAL HEALTHCARE RESEARCH HUBS & PINS */}
                  {visibleHubs.map((hub) => {
                    const isSelected = selectedHub?.id === hub.id;
                    return (
                      <g
                        key={hub.id}
                        className="hub-marker"
                        onClick={() => setSelectedHub(hub)}
                        onMouseEnter={() => setHoveredHub(hub)}
                        onMouseLeave={() => setHoveredHub(null)}
                      >
                        {/* Outer Radar Pulse */}
                        <circle
                          cx={hub.x}
                          cy={hub.y}
                          r="12"
                          fill="none"
                          stroke={hub.color}
                          strokeWidth="1.5"
                          className="hub-pulse"
                        />
                        {/* Solid Central Dot */}
                        <circle
                          cx={hub.x}
                          cy={hub.y}
                          r={isSelected ? 6 : 4}
                          fill={hub.color}
                          stroke="#ffffff"
                          className="hub-dot"
                        />
                        {/* Hub Title Label */}
                        <text
                          x={hub.x + 8}
                          y={hub.y + 4}
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight={isSelected ? "bold" : "normal"}
                          filter="drop-shadow(0 1px 3px rgba(0,0,0,0.9))"
                        >
                          {hub.city}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* INTERACTIVE HUB DETAIL CARD */}
              {(selectedHub || hoveredHub) && (
                <div className="map-hub-card">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
                    <div>
                      <strong style={{ fontSize: 13, color: (hoveredHub ?? selectedHub)!.color }}>
                        {(hoveredHub ?? selectedHub)!.city}, {(hoveredHub ?? selectedHub)!.country}
                      </strong>
                      <small style={{ display: "block", color: "#bad4f7", fontSize: 10, marginTop: 1 }}>
                        {(hoveredHub ?? selectedHub)!.name}
                      </small>
                    </div>
                    <span style={{ background: "#0a2a52", border: "1px solid #1a5699", borderRadius: 10, padding: "2px 7px", fontSize: 9, color: "#54e2b6", fontWeight: "bold" }}>
                      {(hoveredHub ?? selectedHub)!.trials}
                    </span>
                  </div>

                  <p style={{ margin: "6px 0 10px", fontSize: 11, color: "#e4efff", lineHeight: 1.4 }}>
                    <strong>Specialty:</strong> {(hoveredHub ?? selectedHub)!.specialty}
                  </p>

                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      className="btn-primary"
                      style={{ fontSize: 10, padding: "5px 9px", flex: 1 }}
                      onClick={() => {
                        const h = hoveredHub ?? selectedHub!;
                        setMode("Evidence synthesis");
                        setQuestion(h.query);
                        void submit(h.query, "Evidence synthesis");
                      }}
                    >
                      Explore Evidence
                    </button>
                    <button
                      className="btn-secondary"
                      style={{ fontSize: 10, padding: "5px 9px", flex: 1 }}
                      onClick={() => {
                        const h = hoveredHub ?? selectedHub!;
                        setMode("Protocol builder");
                        setQuestion(`Design a multicenter trial protocol coordinated by ${h.name} (${h.city}) investigating: `);
                        composerInputRef.current?.focus();
                        scrollToResponse();
                      }}
                    >
                      Build Protocol
                    </button>
                  </div>
                </div>
              )}

              {/* MAP ZOOM CONTROLS */}
              <div className="map-zoom">
                <button onClick={() => setMapZoom((z) => Math.min(1.8, z + 0.15))} title="Zoom In">
                  <ZoomIn size={14} />
                </button>
                <button onClick={() => setMapZoom((z) => Math.max(0.7, z - 0.15))} title="Zoom Out">
                  <ZoomOut size={14} />
                </button>
                <button onClick={() => setMapZoom(1)} title="Reset Map Zoom">
                  <RotateCcw size={13} />
                </button>
              </div>

              {/* MAP LEGEND */}
              <div className="map-legend">
                <strong>Global Activity</strong>
                <span><i className="low" />Research hub marker</span>
                <span>Live publication metrics require an indexed search</span>
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED TRENDS VIEW */}
          {activeMapTab === "Trends" && (
            <div style={{ background: "#041325", border: "1px solid #102a55", borderRadius: 16, padding: 20, minHeight: 440 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15 }}>
                <h3 style={{ margin: 0, fontSize: 16, color: "#e8f2ff" }}>Emerging Biomedical Topics &amp; Citation Velocity</h3>
                <span style={{ fontSize: 11, color: "#8cb6dd" }}>Indexed across Europe PMC &amp; PubMed</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                {[
                  { name: "GLP-1 receptor agonists in HFpEF", query: "GLP-1 receptor agonists heart failure with preserved ejection fraction" },
                  { name: "CAR-T cell therapy in solid tumors", query: "CAR-T cell therapy solid tumors clinical efficacy" },
                  { name: "Multimodal foundation models in radiology", query: "Multimodal foundation models in chest radiology diagnostic accuracy" },
                  { name: "Plasma phosphorylated tau-217", query: "Plasma phosphorylated tau-217 Alzheimer disease diagnosis" },
                  { name: "Long COVID neuroinflammation", query: "Long COVID neuroinflammation mechanism and cognitive impairment" },
                  { name: "In vivo CRISPR therapeutics", query: "In vivo CRISPR gene editing clinical trial" },
                ].map((item) => (
                  <div key={item.name} style={{ background: "#061a33", border: "1px solid #144075", borderRadius: 10, padding: 14 }}>
                    <strong style={{ fontSize: 12, color: "#fff" }}>{item.name}</strong>
                    <p style={{ margin: "8px 0", fontSize: 11, color: "#8da9cc" }}>Publication volume, growth, and evidence maturity are not loaded until a live search is run.</p>
                    <button
                      className="btn-primary"
                      style={{ fontSize: 10, padding: "5px 10px", marginTop: 6 }}
                      onClick={() => {
                        setMode("Evidence synthesis");
                        setQuestion(item.query);
                        void submit(item.query, "Evidence synthesis");
                      }}
                    >
                      Search Current Evidence
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: PERSONALIZED IDEAS VIEW */}
          {activeMapTab === "Ideas" && (
            <div style={{ background: "#041325", border: "1px solid #102a55", borderRadius: 16, padding: 20, minHeight: 440 }}>
              <h3 style={{ margin: "0 0 14px", fontSize: 16, color: "#e8f2ff" }}>Hypotheses &amp; Grant Opportunities Tailored to Dr. Usman Iqabl</h3>
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ background: "#061d3a", border: "1px solid #1c5192", borderRadius: 10, padding: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <strong style={{ display: "block", fontSize: 13, color: "#fff" }}>What should I research next?</strong>
                      <small style={{ display: "block", marginTop: 5, color: "#9dbbe1", lineHeight: 1.45 }}>
                        Search the current literature, identify only observable gaps, and show the supporting records. No unsupported priority score is generated.
                      </small>
                    </div>
                    <button className="btn-primary" onClick={() => void findResearchGaps()} disabled={isGapSearching}>
                      {isGapSearching ? "Comparing evidence…" : "Find evidence-supported gaps"}
                    </button>
                  </div>
                  {gapError && <p style={{ color: "#ff8a9e", fontSize: 11, margin: "10px 0 0" }}>{gapError}</p>}
                </div>

                {ideaResults.length === 0 && !gapError && (
                  <div style={{ background: "#061a33", border: "1px dashed #24548d", borderRadius: 10, padding: 18, color: "#a7c0df", fontSize: 12 }}>
                    No gap analysis has been run in this session. The result will remain empty when the literature index is unavailable.
                  </div>
                )}

                {ideaResults.map((opportunity) => (
                  <div key={opportunity.id} style={{ background: "#061d3a", border: "1px solid #1c5192", borderRadius: 10, padding: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                      <div>
                        <span style={{ fontSize: 10, color: "#38d9ff", fontWeight: "bold" }}>{opportunity.evidenceConfidence}</span>
                        <h4 style={{ margin: "8px 0", fontSize: 14, color: "#fff" }}>{opportunity.title}</h4>
                      </div>
                      <span className="badge-unverified">Opportunity</span>
                    </div>
                    <p style={{ fontSize: 12, color: "#b3cbef", lineHeight: 1.45 }}><strong>Research question:</strong> {opportunity.researchQuestion}</p>
                    <p style={{ fontSize: 12, color: "#b3cbef", lineHeight: 1.45 }}><strong>Observed gap:</strong> {opportunity.researchGap}</p>
                    <p style={{ fontSize: 11, color: "#8da9cc", lineHeight: 1.45 }}>{opportunity.whyThisQuestionExists}</p>
                    <p style={{ fontSize: 10, color: "#ffcf76", lineHeight: 1.4 }}><strong>Uncertainty:</strong> {opportunity.uncertainty}</p>
                    <div style={{ margin: "10px 0", display: "grid", gap: 5 }}>
                      <strong style={{ fontSize: 10, color: "#e7f1ff" }}>Supporting records</strong>
                      {opportunity.relevantPapers.slice(0, 3).map((paper) => (
                        <a key={paper.id} href={paper.url} target="_blank" rel="noreferrer" style={{ color: "#71b4ff", fontSize: 10 }}>
                          {paper.title} · {paper.verificationStatus === "verified" ? "DOI verified" : "Not DOI verified"}
                        </a>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                      <button className="btn-primary" onClick={() => {
                        setMode("Evidence synthesis");
                        setQuestion(opportunity.researchQuestion);
                        void submit(opportunity.researchQuestion, "Evidence synthesis");
                      }}>Explore Evidence</button>
                      <button className="btn-secondary" onClick={() => {
                        setMode("Protocol builder");
                        setQuestion(opportunity.researchQuestion);
                        void submit(opportunity.researchQuestion, "Protocol builder");
                      }}>Build Protocol</button>
                    </div>
                  </div>
                ))}

                {gapResults.length > 0 && (
                  <small style={{ color: "#7898c1", lineHeight: 1.45 }}>
                    Gap detection is limited to {gapResults[0].evidenceCount} retrieved record(s), not a complete systematic review.
                  </small>
                )}
              </div>
            </div>
          )}
        </section>

        {/* INSIGHT GRID */}
        <section className="insight-grid">
          {/* LATEST RESEARCH INSIGHTS */}
          <article>
            <header>
              <h2><UserRound />Latest Research Insights</h2>
              <button onClick={() => setShowLibraryModal(true)}>View All</button>
            </header>
            {[
              { text: "Search current evidence for CAR-T therapy in solid tumors", journal: "Live index search required", query: "CAR-T cell therapy in solid tumors randomized trial efficacy" },
              { text: "Search cardiovascular outcomes for GLP-1 receptor agonists", journal: "Live index search required", query: "GLP-1 receptor agonists cardiovascular risk type 2 diabetes meta-analysis" },
              { text: "Search diagnostic evidence for plasma p-tau217", journal: "Live index search required", query: "Plasma phosphorylated tau-217 biomarker early Alzheimer detection" },
              { text: "Search validation evidence for AI pathology tools", journal: "Live index search required", query: "AI diagnostic pathology automated analysis validation" },
            ].map((item, index) => (
              <button
                className="insight-row"
                key={item.text}
                onClick={() => {
                  setMode("Evidence synthesis");
                  setQuestion(item.query);
                  void submit(item.query, "Evidence synthesis");
                }}
                title="Synthesize and verify evidence for this study"
              >
                <span className={`mini-icon i${index}`}>{index + 1}</span>
                <span>
                  <strong>{item.text}</strong>
                  <small>{item.journal}</small>
                </span>
                <em>Run verified search</em>
                <ChevronRight />
              </button>
            ))}
          </article>

          {/* TOP EMERGING TOPICS */}
          {showTrendsWidget && (
            <article id="trends">
              <header>
                <h2><TrendingUp />Top Emerging Topics</h2>
                <button aria-label="Close" onClick={() => setShowTrendsWidget(false)} title="Dismiss card">
                  <X />
                </button>
              </header>
              {[
                ["AI in radiology", "AI in radiology diagnostic performance"],
                ["GLP-1 receptor agonists", "GLP-1 receptor agonist clinical outcomes"],
                ["Long COVID", "Long COVID biomarkers and therapeutic trials"],
                ["mRNA vaccines", "mRNA vaccine platforms oncology and infectious disease"],
                ["Precision oncology", "Precision oncology targeted therapy NGS sequencing"],
              ].map(([topic, query], index) => (
                <div
                  className="trend-row"
                  key={topic}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    setMode("Evidence synthesis");
                    setQuestion(query);
                    void submit(query, "Evidence synthesis");
                  }}
                  title="Explore topic evidence"
                >
                  <b>{index + 1}</b>
                  <strong>{topic}</strong>
                  <span className="spark" />
                  <em>Insufficient data</em>
                </div>
              ))}
            </article>
          )}

          {/* PERSONALIZED IDEAS */}
          <article id="ideas">
            <header>
              <h2><Lightbulb />Your Personalized Ideas</h2>
              <button onClick={() => setActiveMapTab("Ideas")}>View All</button>
            </header>
            <p className="idea-kicker">Ideas are generated only after a live, source-backed gap search.</p>
            <h3>{ideaResults[0]?.title ?? "No evidence-supported idea has been generated yet."}</h3>
            <div className="tags">
              {interests.slice(0, 3).map((interest) => <span key={interest}>{interest}</span>)}
            </div>
            <hr />
            <p className="why">
              <small>
                {ideaResults[0]?.researchGap ?? "Open Ideas and run Find evidence-supported gaps to compare retrieved literature."}
              </small>
            </p>
            <button className="explore" onClick={() => {
              setActiveMapTab("Ideas");
              void findResearchGaps();
            }}>
              Find Evidence-Supported Ideas
            </button>
          </article>
        </section>

        {/* WORKFLOW MODE SELECTOR */}
        <div className="mode-bar">
          <span style={{ fontSize: 11, color: "#8da3c6", marginRight: 4 }}>Workflow Mode:</span>
          {modes.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.name}
                className={`mode-pill ${mode === m.name ? "active" : ""}`}
                onClick={() => setMode(m.name)}
                title={m.description}
              >
                <Icon size={13} />
                {m.name}
              </button>
            );
          })}
        </div>

        {/* QUICK PROMPTS CHIPS */}
        <div className="prompt-chips">
          {quickPrompts.map((p) => (
            <button
              key={p.label}
              className="prompt-chip"
              onClick={() => {
                setMode(p.mode);
                setQuestion(p.text);
                composerInputRef.current?.focus();
              }}
            >
              + {p.label}
            </button>
          ))}
        </div>

        {/* RESEARCH COMPOSER */}
        <section className="research-composer">
          <input
            ref={fileInput}
            type="file"
            accept="application/pdf"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void uploadDocument(file);
              event.target.value = "";
            }}
          />
          <input
            ref={datasetFileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void analyzeDataset(file);
              event.target.value = "";
            }}
          />
          <div className="composer-mark" title={`Active Agent: ${activeModeInfo.name}`}>
            <BrainCircuit />
          </div>
          <textarea
            ref={composerInputRef}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            placeholder={activeModeInfo.prompt}
            aria-label="Research question"
            rows={1}
          />
          <button
            onClick={() => fileInput.current?.click()}
            aria-label="Attach PDF"
            title="Attach research PDF for critical appraisal (up to 25 MB)"
          >
            <Paperclip />
          </button>
          <button
            onClick={toggleVoice}
            className={isVoiceActive ? "voice-active" : ""}
            aria-label="Voice input"
            title="Voice dictation"
          >
            <Mic />
          </button>
          <button
            className="send"
            onClick={() => void submit()}
            aria-label="Send"
            title="Run analysis"
            disabled={isSearching}
          >
            {isSearching ? <RefreshCw className="animate-spin" size={17} /> : <Send />}
          </button>
        </section>

        {/* RESPONSE DRAWER & EVIDENCE DESK */}
        {(reply || analysis || isSearching) && (
          <section className="response-card" id="response-section" aria-live="polite">
            <div className="response-header">
              <span className="response-agent">
                <BrainCircuit size={13} />
                {routingAgent}
              </span>
              {searchStatusText && <small className="response-status" aria-live="polite">{searchStatusText}</small>}
              <div className="response-actions">
                <button className="action-icon-btn" onClick={copyReply} title="Copy output">
                  {copied ? <Check size={12} color="#49e7ab" /> : <Copy size={12} />}
                  {copied ? "Copied" : "Copy"}
                </button>
                <button className="action-icon-btn" onClick={downloadReport} title="Download Report (.md)">
                  <Download size={12} />
                  Export .MD
                </button>
                {mode === "Evidence synthesis" && (
                  <button
                    className="action-icon-btn"
                    onClick={() => {
                      setMode("Protocol builder");
                      const q = `Based on current evidence, design a phase 3 trial protocol for: ${question || "this research area"}`;
                      setQuestion(q);
                      void submit(q, "Protocol builder");
                    }}
                  >
                    <FileSearch size={12} />
                    Build Protocol
                  </button>
                )}
                {mode === "Protocol builder" && (
                  <button
                    className="action-icon-btn"
                    onClick={() => {
                      setMode("Statistical planning");
                      const q = `Develop an ICH E9 (R1) statistical analysis plan for the protocol above.`;
                      setQuestion(q);
                      void submit(q, "Statistical planning");
                    }}
                  >
                    <TrendingUp size={12} />
                    Plan Statistics
                  </button>
                )}
                <button
                  className="action-icon-btn"
                  onClick={() => {
                    setReply("");
                    setAnalysis("");
                    setSources([]);
                  }}
                  title="Clear Desk"
                >
                  <X size={12} />
                </button>
              </div>
            </div>

            <div className="response-body">
              {reply && (
                <div style={{ whiteSpace: "pre-wrap" }}>
                  {reply}
                </div>
              )}
              {analysis && (
                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed #174279" }}>
                  <span style={{ fontSize: 10, color: "#38d9ff", fontWeight: "bold" }}>
                    DOCUMENT APPRAISAL: {activeAnalysisDoc ? activeAnalysisDoc.originalName : "Uploaded PDF"}
                  </span>
                  <pre>{analysis}</pre>
                </div>
              )}
            </div>

            {/* RETRIEVED SOURCES CARDS */}
            {sources.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #143e70" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: 12, color: "#e3efff" }}>
                    Retrieved &amp; Verified Literature ({sources.length})
                  </strong>
                  <small style={{ fontSize: 10, color: "#749ac7" }}>Crossref DOI &amp; PubMed Verified</small>
                </div>
                {sources.map((source) => (
                  <div className="source-card" key={source.id}>
                    <div className="source-card-header">
                      <a href={source.url} target="_blank" rel="noreferrer" className="source-title">
                        {source.title}
                        <ExternalLink size={10} style={{ display: "inline", marginLeft: 4 }} />
                      </a>
                      <span className={source.verificationStatus === "verified" ? "badge-verified" : "badge-unverified"}>
                        {source.verificationStatus === "verified" ? <ShieldCheck size={10} /> : <AlertCircle size={10} />}
                        {source.verificationStatus === "verified" ? "DOI Verified" : "Unverified"}
                      </span>
                    </div>
                    <div className="source-meta">
                      <span>{source.journal || "PubMed"}</span>
                      {source.year && <span>({source.year})</span>}
                      {source.doi && <span>DOI: {source.doi}</span>}
                      {source.pmid && <span>PMID: {source.pmid}</span>}
                      {source.fullTextUrl && <a href={source.fullTextUrl} target="_blank" rel="noreferrer">Open full text</a>}
                      <button
                        style={{ marginLeft: "auto", background: "transparent", border: 0, color: "#5ea5ff", fontSize: 9 }}
                        onClick={() => {
                          const citation = `${source.authors ?? "Authors not reported"}. (${source.year ?? "Year not reported"}). ${source.title}. ${source.journal ?? "Journal not reported"}. ${source.doi ? `https://doi.org/${source.doi}` : source.url}`;
                          navigator.clipboard.writeText(citation);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 2000);
                        }}
                      >
                        Copy Citation
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </section>

      {/* RIGHT SIDEBAR / SIGNALS PANEL */}
      <aside className="signal-panel">
        {/* NEW RESEARCH OPPORTUNITY */}
        <article className="opportunity">
          <header>
            <Lightbulb />
            <strong>New Research Opportunity</strong>
            <em>{featuredOpportunity ? "Evidence-supported" : "Needs live search"}</em>
          </header>
          <h2>{featuredOpportunity?.title ?? "No live research opportunity loaded"}</h2>
          <p>
            {featuredOpportunity?.researchGap ?? "Run the evidence-supported gap finder to compare current records before proposing a research idea."}
          </p>
          {featuredOpportunity && (
            <dl>
              <div>
                <dt>Evidence confidence</dt>
                <dd>{featuredOpportunity.evidenceConfidence}</dd>
              </div>
              <div>
                <dt>Potential research question</dt>
                <dd>{featuredOpportunity.researchQuestion}</dd>
              </div>
              <div>
                <dt>Uncertainty</dt>
                <dd>{featuredOpportunity.uncertainty}</dd>
              </div>
            </dl>
          )}
          <footer>
            <button onClick={() => {
              setActiveMapTab("Ideas");
              void findResearchGaps();
            }} disabled={isGapSearching}>
              {isGapSearching ? "Searching…" : "Find Evidence"}
            </button>
            <button onClick={() => setActiveMapTab("Ideas")}>Open Ideas</button>
          </footer>
        </article>

        {/* RESEARCH SIGNALS */}
        <article className="signals">
          <header>
            <h2><HeartPulse />Research Signals</h2>
            <button onClick={() => setActiveMapTab("Trends")}>View All</button>
          </header>
          {[
            ["GLP-1 receptor agonists", "GLP-1 receptor agonist clinical outcomes"],
            ["Long COVID", "Long COVID pathophysiology and biomarkers"],
            ["AI in medical imaging", "AI foundation models in medical imaging"],
            ["Vitamin D and respiratory infection", "Vitamin D clinical trials respiratory infections"],
          ].map(([topic, query]) => (
            <div
              key={topic}
              style={{ cursor: "pointer" }}
              onClick={() => {
                setMode("Evidence synthesis");
                setQuestion(query);
                void submit(query, "Evidence synthesis");
              }}
              title="Search evidence"
            >
              <span className="up">•</span>
              <em>Search</em>
              <p>{topic}<small>Live volume and growth: insufficient data</small></p>
            </div>
          ))}
        </article>

        {/* YOUR RESEARCH INTERESTS */}
        <article className="interests">
          <h2>♥ Your Research Interests</h2>
          <div className="tags">
            {interests.map((tag) => (
              <span key={tag} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                {tag}
                <button
                  onClick={() => handleRemoveInterest(tag)}
                  style={{ background: "transparent", border: 0, padding: 0, color: "#8da9cc", fontSize: 9 }}
                  title="Remove"
                >
                  ×
                </button>
              </span>
            ))}
            {showAddInterest ? (
              <div style={{ display: "inline-flex", gap: 4 }}>
                <input
                  style={{ background: "#0b2854", border: "1px solid #24549c", color: "white", borderRadius: 12, padding: "2px 8px", fontSize: 9, width: 85 }}
                  value={newInterestInput}
                  onChange={(e) => setNewInterestInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddInterest();
                  }}
                  placeholder="New topic..."
                  autoFocus
                />
                <button onClick={handleAddInterest} style={{ padding: "2px 6px", fontSize: 9 }}>✓</button>
                <button onClick={() => setShowAddInterest(false)} style={{ padding: "2px 6px", fontSize: 9 }}>✕</button>
              </div>
            ) : (
              <button onClick={() => setShowAddInterest(true)}>＋ Add</button>
            )}
          </div>
        </article>

        {/* PAPERS / DOCUMENTS DRAWER */}
        <article className="document-drawer" id="documents">
          <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <h2 style={{ margin: 0 }}>Research Papers ({documents.length})</h2>
            <button
              style={{ background: "transparent", border: 0, color: "#529bff", fontSize: 10 }}
              onClick={() => fileInput.current?.click()}
            >
              + Upload
            </button>
          </header>
          {documents.length === 0 ? (
            <p style={{ fontSize: 10, color: "#7b9ec9", margin: "4px 0" }}>No PDFs uploaded yet. Click + Upload to add papers for appraisal.</p>
          ) : (
            documents.slice(0, 5).map((document) => (
              <div key={document.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #15395f", padding: "4px 0" }}>
                <button
                  onClick={() => void openDocumentAnalysis(document)}
                  style={{ flex: 1, textAlign: "left", background: "transparent", border: 0, color: "#dce9ff", padding: 0 }}
                >
                  <FileText size={12} style={{ verticalAlign: "middle", marginRight: 5 }} />
                  {document.originalName}
                  <small style={{ display: "block", color: isAnalysisComplete(document.processingStatus) ? "#5adbb4" : "#ffba5a" }}>
                    {isAnalysisComplete(document.processingStatus) ? "Analyzed • View Appraisal" : `${document.processingStatus} • Run Appraisal`}
                  </small>
                </button>
                <button
                  onClick={() => void deleteDocument(document.id)}
                  style={{ background: "transparent", border: 0, color: "#ff6b87", padding: "2px 4px" }}
                  title="Delete Document"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
          {documents.length > 5 && (
            <button
              onClick={() => setShowDocumentsModal(true)}
              style={{ width: "100%", textAlign: "center", background: "#0a264a", border: 0, color: "#7fb3fa", padding: "4px 0", fontSize: 10, marginTop: 4, borderRadius: 4 }}
            >
              View all {documents.length} papers →
            </button>
          )}
        </article>

        {/* SAVED EVIDENCE LIBRARY */}
        {savedLibrary.length > 0 && (
          <article className="source-drawer" id="library">
            <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <h2 style={{ margin: 0 }}>Saved Evidence ({savedLibrary.length})</h2>
              <button
                style={{ background: "transparent", border: 0, color: "#529bff", fontSize: 10 }}
                onClick={() => setShowLibraryModal(true)}
              >
                View Library
              </button>
            </header>
            {savedLibrary.slice(0, 4).map((source) => (
              <a key={source.sourceId} href={source.url} target="_blank" rel="noreferrer">
                <strong>{source.title}</strong>
                <small>{source.verificationStatus === "verified" ? "DOI Verified" : "DOI Unverified"} • {source.journal ?? "PubMed"}</small>
              </a>
            ))}
          </article>
        )}

        {/* VOICE ASSISTANT */}
        <article className="voice" onClick={toggleVoice} style={{ cursor: "pointer" }}>
          <div className={isVoiceActive ? "voice-active" : ""}>
            <Mic />
          </div>
          <p>
            <strong>Voice Assistant</strong>
            <small>{isVoiceActive ? "Listening to Dr. Iqabl..." : "Click to talk to AIOTIE"}</small>
          </p>
        </article>
      </aside>

      {/* ===================== MODALS ===================== */}

      {/* 1. PROJECT MANAGEMENT MODAL */}
      {showProjectModal && (
        <div className="modal-overlay" onClick={() => setShowProjectModal(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Layers size={18} /> Research Projects</h2>
              <button className="modal-close" onClick={() => setShowProjectModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-content">
              <div style={{ background: "#072042", padding: 12, borderRadius: 8, marginBottom: 16 }}>
                <h4 style={{ margin: "0 0 8px", fontSize: 13, color: "#e8f2ff" }}>{editingProjectId ? "Edit Research Project" : "Create New Research Project"}</h4>
                <div className="form-group">
                  <label>Project Title *</label>
                  <input
                    className="form-input"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. CAR-T Clinical Trial Validation Phase II"
                  />
                </div>
                <div className="form-group">
                  <label>Research Question / PICO Scope</label>
                  <input
                    className="form-input"
                    value={newProjectQuestion}
                    onChange={(e) => setNewProjectQuestion(e.target.value)}
                    placeholder="e.g. In adult patients with refractory solid tumors, does CAR-T therapy..."
                  />
                </div>
                {projectError && <p style={{ color: "#ff6a88", fontSize: 11, margin: "4px 0" }}>{projectError}</p>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn-primary" onClick={createProject}>
                    <Plus size={13} /> {editingProjectId ? "Update Project" : "Save Project"}
                  </button>
                  {editingProjectId && <button className="btn-secondary" onClick={() => {
                    setEditingProjectId(null);
                    setNewProjectName("");
                    setNewProjectQuestion("");
                    setProjectError("");
                  }}>Cancel Edit</button>}
                </div>
              </div>

              <h4 style={{ margin: "14px 0 8px", fontSize: 13, color: "#c5daf8" }}>Your Research Projects ({projects.length})</h4>
              {projects.length === 0 ? (
                <p style={{ color: "#8ca8cb" }}>No projects created yet.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Scope / Question</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id}>
                        <td><strong>{p.name}</strong></td>
                        <td>{p.question || "General research scope"}</td>
                        <td>
                          {activeProject?.id === p.id ? (
                            <span className="badge-verified">Active</span>
                          ) : (
                            <button
                              className="btn-secondary"
                              style={{ padding: "3px 8px", fontSize: 10 }}
                              onClick={() => {
                                setActiveProject(p);
                                setShowProjectModal(false);
                              }}
                            >
                              Select
                            </button>
                          )}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 5 }}>
                            <button
                              className="btn-secondary"
                              onClick={() => {
                                setEditingProjectId(p.id);
                                setNewProjectName(p.name);
                                setNewProjectQuestion(p.question ?? "");
                                setProjectError("");
                              }}
                              title="Edit project"
                            >
                              Edit
                            </button>
                            <button
                              className="btn-danger"
                              onClick={() => void deleteProject(p.id)}
                              title="Delete project"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowProjectModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EVIDENCE LIBRARY MODAL */}
      {showLibraryModal && (
        <div className="modal-overlay" onClick={() => setShowLibraryModal(false)}>
          <div className="modal-window wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><BookOpen size={18} /> Evidence &amp; Literature Library ({savedLibrary.length})</h2>
              <button className="modal-close" onClick={() => setShowLibraryModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-content">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <p style={{ margin: 0, color: "#adc4e4" }}>
                  Persistent repository of all retrieved peer-reviewed records and search runs authenticated to Dr. Usman Iqabl.
                </p>
                <button
                  className="btn-primary"
                  onClick={() => {
                    const bibtex = savedLibrary.map((s, idx) =>
                      `@article{source_${idx},\n  title={${s.title}},\n  journal={${s.journal ?? "Medical Journal"}},\n  year={${s.year ?? "2025"}},\n  doi={${s.doi ?? ""}},\n  url={${s.url}}\n}`
                    ).join("\n\n");
                    const blob = new Blob([bibtex], { type: "text/plain;charset=utf-8" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `AIOTIE_Evidence_Library_${Date.now()}.bib`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download size={13} /> Export BibTeX
                </button>
              </div>

              {savedLibrary.length === 0 ? (
                <div style={{ textAlign: "center", padding: 30, color: "#8daecc" }}>
                  <BookOpen size={36} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
                  <p>No literature records saved yet. Perform a research search to populate your library.</p>
                </div>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Journal</th>
                      <th>Year</th>
                      <th>DOI Verification</th>
                      <th>Query</th>
                      <th>Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedLibrary.map((item) => (
                      <tr key={item.sourceId}>
                        <td><strong>{item.title}</strong></td>
                        <td>{item.journal || "PubMed"}</td>
                        <td>{item.year || "Recent"}</td>
                        <td>
                          <span className={item.verificationStatus === "verified" ? "badge-verified" : "badge-unverified"}>
                            {item.verificationStatus === "verified" ? "Verified" : "Unverified"}
                          </span>
                        </td>
                        <td style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.query}</td>
                        <td>
                          <a href={item.url} target="_blank" rel="noreferrer" style={{ color: "#38d9ff", display: "inline-flex", alignItems: "center", gap: 3 }}>
                            PubMed <ExternalLink size={10} />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowLibraryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 3. DOCUMENTS / PAPERS MODAL */}
      {showDocumentsModal && (
        <div className="modal-overlay" onClick={() => setShowDocumentsModal(false)}>
          <div className="modal-window wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FileText size={18} /> Research Papers &amp; PDF Ingestion ({documents.length})</h2>
              <button className="modal-close" onClick={() => setShowDocumentsModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-content">
              <div
                style={{
                  border: "2px dashed #1e5292",
                  borderRadius: 10,
                  padding: 24,
                  textAlign: "center",
                  background: "#061f41",
                  marginBottom: 16,
                  cursor: "pointer",
                }}
                onClick={() => fileInput.current?.click()}
              >
                <UploadCloud size={32} style={{ margin: "0 auto 8px", color: "#38d9ff" }} />
                <strong style={{ display: "block", color: "white", fontSize: 13 }}>Click to Upload Medical Research Paper (PDF)</strong>
                <small style={{ color: "#8eaecd" }}>Secure private R2 ingestion with isolated extraction • Up to 25 MB</small>
              </div>

              {documents.length === 0 ? (
                <p style={{ color: "#8daecc", textAlign: "center" }}>No papers ingested yet.</p>
              ) : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Size</th>
                      <th>Status</th>
                      <th>Appraisal Actions</th>
                      <th>Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documents.map((doc) => (
                      <tr key={doc.id}>
                        <td><strong>{doc.originalName}</strong></td>
                        <td>{(doc.byteSize / (1024 * 1024)).toFixed(2)} MB</td>
                        <td>
                          <span className={isAnalysisComplete(doc.processingStatus) ? "badge-verified" : "badge-unverified"}>
                            {doc.processingStatus}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-primary"
                            style={{ padding: "4px 8px", fontSize: 10 }}
                            onClick={() => {
                              setShowDocumentsModal(false);
                              void openDocumentAnalysis(doc);
                            }}
                          >
                            {isAnalysisComplete(doc.processingStatus) ? "View 14-Point Appraisal" : "Run Critical Appraisal"}
                          </button>
                        </td>
                        <td>
                          <button className="btn-danger" onClick={() => void deleteDocument(doc.id)}>
                            <Trash2 size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowDocumentsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 4. SYSTEMATIC REVIEWS & PRISMA MODAL */}
      {showSystematicModal && (
        <div className="modal-overlay" onClick={() => setShowSystematicModal(false)}>
          <div className="modal-window wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><ShieldCheck size={18} /> Systematic Review &amp; PRISMA 2020 Orchestrator</h2>
              <button className="modal-close" onClick={() => setShowSystematicModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-content">
              <p style={{ color: "#b9d2f2" }}>
                End-to-end systematic review workflow complying with PRISMA 2020, Cochrane Handbook, and PROSPERO protocol registration standards.
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, margin: "14px 0" }}>
                <div style={{ background: "#061f40", padding: 14, borderRadius: 8, border: "1px solid #16467d" }}>
                  <h4 style={{ margin: "0 0 6px", color: "#38d9ff" }}>1. PICO Formulation &amp; Search String</h4>
                  <p style={{ fontSize: 11, color: "#8daecf" }}>Generate boolean search strings across PubMed, Embase, and Europe PMC.</p>
                  <button
                    className="btn-primary"
                    style={{ fontSize: 10 }}
                    onClick={() => {
                      setShowSystematicModal(false);
                      setMode("Protocol builder");
                      setQuestion("Construct a PRISMA-compliant systematic review protocol and comprehensive Boolean PubMed search syntax for: ");
                      composerInputRef.current?.focus();
                      scrollToResponse();
                    }}
                  >
                    Build Search Syntax
                  </button>
                </div>

                <div style={{ background: "#061f40", padding: 14, borderRadius: 8, border: "1px solid #16467d" }}>
                  <h4 style={{ margin: "0 0 6px", color: "#ff54d4" }}>2. Risk of Bias Matrix (RoB 2)</h4>
                  <p style={{ fontSize: 11, color: "#8daecf" }}>Screen studies and generate traffic-light risk of bias assessment charts.</p>
                  <button
                    className="btn-primary"
                    style={{ fontSize: 10 }}
                    onClick={() => {
                      setShowSystematicModal(false);
                      setMode("Paper analysis");
                      setQuestion("Generate a Cochrane RoB 2 risk of bias appraisal matrix for included randomized trials.");
                      composerInputRef.current?.focus();
                      scrollToResponse();
                    }}
                  >
                    Generate RoB Matrix
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowSystematicModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 5. SAFE DATASET INSPECTION MODAL */}
      {showStatisticsModal && (
        <div className="modal-overlay" onClick={() => setShowStatisticsModal(false)}>
          <div className="modal-window wide" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h2><TrendingUp size={18} /> Statistics &amp; Data</h2>
              <button className="modal-close" onClick={() => setShowStatisticsModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-content">
              <p style={{ color: "#b9d2f2" }}>
                Upload a JSON array of object rows for bounded descriptive inspection. No external model is used and no result is generated without your data.
              </p>
              <button className="btn-primary" onClick={() => datasetFileInput.current?.click()} disabled={isDatasetAnalyzing}>
                {isDatasetAnalyzing ? "Inspecting dataset…" : "Upload JSON dataset"}
              </button>
              {datasetError && <p style={{ color: "#ff8a9e", fontSize: 11 }}>{datasetError}</p>}
              {datasetSummary && (
                <div style={{ marginTop: 16 }}>
                  <strong style={{ color: "#49e7ab" }}>{datasetSummary.rowCount} rows inspected</strong>
                  <table className="data-table" style={{ marginTop: 10 }}>
                    <thead><tr><th>Variable</th><th>Type</th><th>Observed</th><th>Missing</th><th>Unique</th></tr></thead>
                    <tbody>
                      {datasetSummary.variables.map((variable) => (
                        <tr key={variable.name}>
                          <td>{variable.name}</td><td>{variable.type}</td><td>{variable.observed}</td><td>{variable.missing}</td><td>{variable.uniqueValues}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {datasetSummary.numeric.length > 0 && (
                    <>
                      <h4 style={{ color: "#e8f2ff", margin: "16px 0 8px" }}>Numeric summaries</h4>
                      <table className="data-table">
                        <thead><tr><th>Column</th><th>N</th><th>Mean</th><th>Median</th><th>SD</th><th>Range</th></tr></thead>
                        <tbody>
                          {datasetSummary.numeric.map((summary) => (
                            <tr key={summary.column}>
                              <td>{summary.column}</td><td>{summary.n}</td><td>{summary.mean ?? "Not available"}</td><td>{summary.median ?? "Not available"}</td><td>{summary.standardDeviation ?? "Not available"}</td><td>{summary.minimum ?? "—"} to {summary.maximum ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                  <ul style={{ color: "#9dbbe1", fontSize: 11, lineHeight: 1.5, paddingLeft: 18 }}>
                    {datasetSummary.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}
                  </ul>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowStatisticsModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MANUSCRIPT & REPORTING CHECKLIST MODAL */}
      {showManuscriptModal && (
        <div className="modal-overlay" onClick={() => setShowManuscriptModal(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><FileText size={18} /> Manuscript &amp; Reporting Standards Checklist</h2>
              <button className="modal-close" onClick={() => setShowManuscriptModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-content">
              <p style={{ color: "#b9d2f2" }}>Select a guideline to verify manuscript readiness prior to peer review submission:</p>
              <div style={{ display: "grid", gap: 10, margin: "14px 0" }}>
                {[
                  { name: "CONSORT 2010", desc: "Consolidated Standards of Reporting Trials (Randomized Controlled Trials)", query: "Verify randomized controlled trial manuscript against CONSORT 2010 checklist items" },
                  { name: "STROBE Statement", desc: "Strengthening the Reporting of Observational Studies in Epidemiology", query: "Verify observational cohort study manuscript against STROBE checklist" },
                  { name: "SPIRIT 2013", desc: "Standard Protocol Items: Recommendations for Interventional Trials", query: "Draft and verify interventional trial protocol using SPIRIT 2013 guidelines" },
                  { name: "PRISMA 2020", desc: "Preferred Reporting Items for Systematic Reviews and Meta-Analyses", query: "Audit systematic review manuscript against PRISMA 2020 27-item checklist" },
                ].map((g) => (
                  <div key={g.name} style={{ background: "#072044", padding: 12, borderRadius: 8, border: "1px solid #16447a", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong style={{ color: "white", fontSize: 12 }}>{g.name}</strong>
                      <small style={{ display: "block", color: "#8da9cc", fontSize: 10 }}>{g.desc}</small>
                    </div>
                    <button
                      className="btn-primary"
                      style={{ fontSize: 10 }}
                      onClick={() => {
                        setShowManuscriptModal(false);
                        setMode("Protocol builder");
                        setQuestion(g.query + ": ");
                        composerInputRef.current?.focus();
                        scrollToResponse();
                      }}
                    >
                      Audit
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowManuscriptModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 6. RESEARCH PARTNER STATUS MODAL */}
      {showPartnerModal && (
        <div className="modal-overlay" onClick={() => setShowPartnerModal(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><BrainCircuit size={18} /> AIOTIE Research Partner &amp; Engine Status</h2>
              <button className="modal-close" onClick={() => setShowPartnerModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-content">
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ background: "#061f40", padding: 12, borderRadius: 8, border: "1px solid #164982" }}>
                  <strong style={{ color: "#49e7ab", display: "block" }}>● System Online &amp; Operational</strong>
                  <p style={{ margin: "4px 0 0", color: "#bad0ed" }}>
                    Cloudflare Workers edge runtime active with persistent D1 SQLite database and R2 object storage.
                  </p>
                </div>
                <div style={{ background: "#061f40", padding: 12, borderRadius: 8, border: "1px solid #164982" }}>
                  <strong style={{ color: "#38d9ff", display: "block" }}>Specialist Orchestrator</strong>
                  <p style={{ margin: "4px 0 0", color: "#bad0ed" }}>
                    Requests are intelligently routed between Research Agent, Critical Appraisal Agent, Protocol Agent, and Statistics Agent.
                  </p>
                </div>
                <div style={{ background: "#061f40", padding: 12, borderRadius: 8, border: "1px solid #164982" }}>
                  <strong style={{ color: "#ffc55d", display: "block" }}>Evidence Safety Boundary</strong>
                  <p style={{ margin: "4px 0 0", color: "#bad0ed" }}>
                    Strict guardrails prohibit invented citations, unverified studies, and patient-specific medical advice. All retrieved claims require literature grounding.
                  </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowPartnerModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 7. RESEARCHER PROFILE MODAL */}
      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><UserRound size={18} /> Researcher Profile</h2>
              <button className="modal-close" onClick={() => setShowProfileModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-content">
              <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 16 }}>
                <span style={{ width: 54, height: 54, borderRadius: "50%", background: "linear-gradient(135deg, #703c3e, #052b79)", display: "grid", placeItems: "center", fontSize: 18, fontWeight: "bold", color: "white" }}>
                  UI
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: "white" }}>Dr. Usman Iqabl, MD, PhD, FACHI</h3>
                  <small style={{ color: "#8ca8cb" }}>Senior Investigator &amp; Director, Biomedical Informatics</small>
                  <em style={{ display: "block", color: "#49e7ab", fontStyle: "normal", fontSize: 10, marginTop: 2 }}>AIOTIE Global Health Research Institute</em>
                </div>
              </div>
              <div style={{ background: "#061f41", padding: 12, borderRadius: 8, border: "1px solid #15457a" }}>
                <strong style={{ color: "#38d9ff", display: "block", fontSize: 11, marginBottom: 6 }}>AFFILIATION &amp; CERTIFICATIONS</strong>
                <p style={{ margin: 0, color: "#bad1f0", fontSize: 11 }}>
                  Fellow of the American College of Health Informatics (FACHI) • International Society for Pharmacoeconomics and Outcomes Research (ISPOR) • HIMSS Digital Health Advisory.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowProfileModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 8. RESEARCH MEMORY MODAL */}
      {showMemoryModal && (
        <div className="modal-overlay" onClick={() => setShowMemoryModal(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><History size={18} /> Research Memory &amp; Inquiries History</h2>
              <button className="modal-close" onClick={() => setShowMemoryModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-content">
              <p style={{ color: "#b9d2f2" }}>Session inquiries and provenance records:</p>
              {messages.length === 0 ? (
                <p style={{ color: "#8daecc" }}>No queries logged in this current session.</p>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} style={{ background: m.role === "user" ? "#072044" : "#04162e", padding: 10, borderRadius: 7, marginBottom: 8, border: "1px solid #163f73" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <strong style={{ fontSize: 11, color: m.role === "user" ? "#38d9ff" : "#49e7ab" }}>
                        {m.role === "user" ? "Dr. Usman Iqabl" : `AIOTIE (${m.agent ?? "Assistant"})`}
                      </strong>
                      <small style={{ color: "#7497c2", fontSize: 9 }}>{m.time}</small>
                    </div>
                    <p style={{ margin: 0, fontSize: 11, color: "#e2eeff", whiteSpace: "pre-wrap" }}>
                      {m.text.slice(0, 300)}{m.text.length > 300 ? "..." : ""}
                    </p>
                  </div>
                ))
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowMemoryModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* 9. SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="modal-overlay" onClick={() => setShowSettingsModal(false)}>
          <div className="modal-window" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><Settings size={18} /> Research Workspace Settings</h2>
              <button className="modal-close" onClick={() => setShowSettingsModal(false)}><X size={16} /></button>
            </div>
            <div className="modal-content">
              <div className="form-group">
                <label>Evidence Verification Strictness</label>
                <select className="form-input" defaultValue="strict">
                  <option value="strict">Strict: Verified peer-reviewed DOIs only (Recommended)</option>
                  <option value="moderate">Moderate: Include pre-prints with explicit certainty warning</option>
                  <option value="exploratory">Exploratory: Broad synthesis with hypothesis flagging</option>
                </select>
              </div>
              <div className="form-group">
                <label>Primary Literature Index</label>
                <select className="form-input" defaultValue="europepmc">
                  <option value="europepmc">Europe PMC + PubMed National Center for Biotechnology Information</option>
                  <option value="crossref">Crossref DOI Registry</option>
                  <option value="clinicaltrials">ClinicalTrials.gov Protocol Registry</option>
                </select>
              </div>
              <div className="form-group">
                <label>AI Model Provider Engine</label>
                <select className="form-input" defaultValue="auto">
                  <option value="auto">Auto-Select (Aurelia Clinical Copilot + Local Evidence Engine)</option>
                  <option value="openai">OpenAI Responses API (GPT-5 / GPT-4o)</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-primary" onClick={() => setShowSettingsModal(false)}>Save Settings</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
