import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BookOpen,
  Compass,
  Download,
  FolderOpen,
  Save,
  Share2,
  SlidersHorizontal,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import {
  CHANNEL_LABELS,
  INSTRUMENTS,
  INSTRUMENT_CATEGORIES,
} from "../data/instruments";
import type { RecordedNote } from "../hooks/useAudioEngine";

export interface SavedProject {
  id: string;
  name: string;
  bpm: number;
  notes: RecordedNote[];
  instrumentMap: Record<number, string>;
  savedAt: number;
}

interface MenuPanelProps {
  open: boolean;
  onClose: () => void;
  projectName: string;
  bpm: number;
  onBpmChange: (bpm: number) => void;
  notes: RecordedNote[];
  instrumentMap: Record<number, string>;
  onSave: () => void;
  onDownload: () => void;
  onDownloadJson: () => void;
  onLoadProject: (p: SavedProject) => void;
  onAssignInstrument: (channelId: number, instrument: string) => void;
  activeChannelForAssign: number | null;
  onClearActiveChannel: () => void;
}

const STORAGE_KEY = "musicmouth_projects";

export function loadProjects(): SavedProject[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveProject(p: SavedProject) {
  const existing = loadProjects();
  const idx = existing.findIndex((x) => x.id === p.id);
  if (idx >= 0) existing[idx] = p;
  else existing.push(p);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function deleteProject(id: string) {
  const existing = loadProjects().filter((x) => x.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function MenuPanel({
  open,
  onClose,
  projectName,
  bpm,
  onBpmChange,
  notes,
  instrumentMap,
  onSave,
  onDownload,
  onDownloadJson,
  onLoadProject,
  onAssignInstrument,
  activeChannelForAssign,
  onClearActiveChannel,
}: MenuPanelProps) {
  const [tab, setTab] = useState("main");
  const [libSearch, setLibSearch] = useState("");
  const [libCategory, setLibCategory] = useState("All");
  const [projects, setProjects] = useState<SavedProject[]>(() =>
    loadProjects(),
  );

  const refreshProjects = () => setProjects(loadProjects());

  const handleShare = () => {
    const data = { name: projectName, bpm, notes, instrumentMap };
    const encoded = btoa(JSON.stringify(data));
    const url = `${window.location.origin}${window.location.pathname}#project=${encoded}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast.success("Share link copied!"));
  };

  const handleDeleteProject = (id: string) => {
    deleteProject(id);
    refreshProjects();
    toast.success("Project deleted");
  };

  const filteredInstruments = INSTRUMENTS.filter((i) => {
    const matchCat = libCategory === "All" || i.category === libCategory;
    const matchSearch = i.name.toLowerCase().includes(libSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 h-full w-full max-w-md z-50 flex flex-col"
            style={{
              background: "oklch(0.12 0.015 240)",
              borderLeft: "1px solid oklch(0.28 0.02 240)",
            }}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-display text-lg font-bold text-neon-teal">
                Menu
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                data-ocid="menu.close_button"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <Tabs
              value={tab}
              onValueChange={setTab}
              className="flex flex-col flex-1 min-h-0"
            >
              <TabsList className="mx-4 mt-3 grid grid-cols-3 bg-muted">
                <TabsTrigger value="main" data-ocid="menu.main.tab">
                  Actions
                </TabsTrigger>
                <TabsTrigger
                  value="projects"
                  data-ocid="menu.projects.tab"
                  onClick={refreshProjects}
                >
                  Projects
                </TabsTrigger>
                <TabsTrigger value="library" data-ocid="menu.library.tab">
                  Library
                </TabsTrigger>
              </TabsList>

              <TabsContent
                value="main"
                className="flex-1 overflow-auto p-4 space-y-3"
              >
                <Button
                  className="w-full justify-start gap-3 h-12"
                  variant="outline"
                  onClick={() => {
                    onSave();
                    toast.success("Project saved!");
                  }}
                  data-ocid="menu.save.button"
                >
                  <Save className="w-5 h-5 text-neon-teal" />
                  Save Project
                </Button>

                <Button
                  className="w-full justify-start gap-3 h-12"
                  variant="outline"
                  onClick={onDownload}
                  data-ocid="menu.download.button"
                >
                  <Download className="w-5 h-5 text-neon-teal" />
                  Download WAV
                </Button>

                <Button
                  className="w-full justify-start gap-3 h-12"
                  variant="outline"
                  onClick={onDownloadJson}
                  data-ocid="menu.download_json.button"
                >
                  <Download className="w-5 h-5 text-neon-purple" />
                  Download Project (JSON)
                </Button>

                <Button
                  className="w-full justify-start gap-3 h-12"
                  variant="outline"
                  onClick={handleShare}
                  data-ocid="menu.share.button"
                >
                  <Share2 className="w-5 h-5 text-neon-cyan" />
                  Share (Copy Link)
                </Button>

                <div className="mt-4 p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 mb-3">
                    <SlidersHorizontal className="w-4 h-4 text-neon-yellow" />
                    <span className="text-sm font-semibold">BPM Settings</span>
                    <Badge
                      variant="outline"
                      className="ml-auto text-neon-yellow border-neon-yellow"
                    >
                      {bpm}
                    </Badge>
                  </div>
                  <Slider
                    min={60}
                    max={200}
                    step={1}
                    value={[bpm]}
                    onValueChange={([v]) => onBpmChange(v)}
                    data-ocid="menu.bpm.input"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>60</span>
                    <span>130</span>
                    <span>200</span>
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 mb-2">
                    <Compass className="w-4 h-4 text-neon-pink" />
                    <span className="text-sm font-semibold">Directions</span>
                  </div>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Press the big RECORD button and allow mic access.</li>
                    <li>
                      Make mouth sounds — kicks, hums, hi-hats, snares,
                      whistles…
                    </li>
                    <li>
                      Each sound lights up its channel meter in real time.
                    </li>
                    <li>
                      Press STOP to end recording; press PLAY to hear your beat.
                    </li>
                    <li>Hit Erase &amp; Re-Record to start fresh.</li>
                    <li>
                      Swap instruments by clicking the instrument badge on any
                      channel.
                    </li>
                    <li>Save, Download, or Share from this menu.</li>
                  </ol>
                </div>
              </TabsContent>

              <TabsContent value="projects" className="flex-1 min-h-0 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen className="w-4 h-4 text-neon-teal" />
                  <span className="text-sm font-semibold">
                    My Projects ({projects.length})
                  </span>
                </div>
                {projects.length === 0 ? (
                  <div
                    className="text-center text-muted-foreground text-sm py-8"
                    data-ocid="projects.empty_state"
                  >
                    No saved projects yet. Record something and save it!
                  </div>
                ) : (
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-2">
                      {projects.map((p, i) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 p-3 rounded-lg border border-border bg-card hover:border-neon-teal/50 transition-colors"
                          data-ocid={`projects.item.${i + 1}`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {p.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.bpm} BPM · {p.notes.length} notes ·{" "}
                              {new Date(p.savedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onLoadProject(p);
                              onClose();
                              toast.success(`Loaded "${p.name}"`);
                            }}
                            data-ocid={`projects.load.button.${i + 1}`}
                          >
                            Load
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteProject(p.id)}
                            data-ocid={`projects.delete_button.${i + 1}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </TabsContent>

              <TabsContent
                value="library"
                className="flex-1 min-h-0 flex flex-col p-4 gap-3"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-neon-purple" />
                  <span className="text-sm font-semibold">
                    Instrument Library
                  </span>
                  <Badge variant="outline" className="ml-auto">
                    {INSTRUMENTS.length}+
                  </Badge>
                </div>

                {activeChannelForAssign !== null && (
                  <div className="text-xs bg-neon-teal/10 border border-neon-teal/30 rounded-md p-2 flex items-center justify-between">
                    <span className="text-neon-teal">
                      Assigning to:{" "}
                      <strong>{CHANNEL_LABELS[activeChannelForAssign]}</strong>
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={onClearActiveChannel}
                      className="h-6 text-xs"
                    >
                      Cancel
                    </Button>
                  </div>
                )}

                <Input
                  placeholder="Search instruments…"
                  value={libSearch}
                  onChange={(e) => setLibSearch(e.target.value)}
                  className="bg-muted"
                  data-ocid="library.search_input"
                />

                <ScrollArea className="flex-1">
                  <div className="space-y-1 pr-2">
                    <div className="flex flex-wrap gap-1 mb-2">
                      {["All", ...INSTRUMENT_CATEGORIES].map((cat) => (
                        <Badge
                          key={cat}
                          variant={libCategory === cat ? "default" : "outline"}
                          className="cursor-pointer text-xs"
                          onClick={() => setLibCategory(cat)}
                          data-ocid="library.category.tab"
                        >
                          {cat}
                        </Badge>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-1">
                      {filteredInstruments.map((instr, i) => (
                        <button
                          type="button"
                          key={instr.name}
                          className="text-left text-xs px-2 py-1.5 rounded border border-border hover:border-neon-teal/60 hover:bg-neon-teal/10 transition-colors truncate"
                          onClick={() => {
                            if (activeChannelForAssign !== null) {
                              onAssignInstrument(
                                activeChannelForAssign,
                                instr.name,
                              );
                              toast.success(
                                `Assigned ${instr.name} to ${CHANNEL_LABELS[activeChannelForAssign]}`,
                              );
                              onClearActiveChannel();
                            } else {
                              toast.info(
                                "Click a channel's instrument badge first to assign",
                              );
                            }
                          }}
                          data-ocid={`library.item.${i + 1}`}
                        >
                          {instr.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
