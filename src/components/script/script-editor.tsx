"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { Placeholder } from "@tiptap/extensions";
import {
  Bold,
  Check,
  Copy,
  Download,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  List,
  ListOrdered,
  Loader2,
  MonitorPlay,
  MoreHorizontal,
  Pilcrow,
  Redo2,
  Save,
  Trash2,
  Underline as UnderlineIcon,
  Undo2,
  AlertCircle,
  LayoutTemplate,
  History,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { deleteScript, duplicateScript, saveScriptContent, updateScriptMeta } from "@/app/(app)/scripts/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger } from "@/components/ui/dropdown";
import { Input, NativeSelect } from "@/components/ui/input";
import { DIALOGUE_ROLES, type DialogueRole } from "@/lib/constants";
import { countWords, formatReading } from "@/lib/script/blocks";
import { SCRIPT_TEMPLATES, type ScriptTemplateKey } from "@/lib/script/template";
import type { TNode } from "@/lib/script/types";
import { cn } from "@/lib/utils";
import { Dialogue } from "./dialogue-extension";
import { VersionHistory } from "./version-history";
import { AiScriptDialog } from "@/components/ai/ai-script";

type SaveState = "saved" | "dirty" | "saving" | "error";

const PLACEHOLDER: Record<string, string> = {
  host: "Tulis teks yang dibacakan host...",
  guest: "Tempat untuk jawaban / poin narasumber...",
  host_note: "Catatan khusus untuk host...",
  transition: "Kalimat penghubung antarsegmen...",
};

const ROLE_STYLE: Record<DialogueRole, string> = {
  host: "data-[on=true]:bg-indigo-100 text-indigo-700",
  guest: "data-[on=true]:bg-green-100 text-green-700",
  host_note: "data-[on=true]:bg-amber-100 text-amber-700",
  transition: "data-[on=true]:bg-slate-200 text-slate-700",
};

function ToolButton({
  onClick,
  active,
  disabled,
  label,
  children,
  className,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      data-on={active}
      className={cn(
        "flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-sm text-secondary hover:bg-muted disabled:opacity-40 data-[on=true]:bg-accent-soft data-[on=true]:text-accent [&_svg]:size-4",
        className,
      )}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      highlight: e.isActive("highlight"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      paragraph: e.isActive("paragraph"),
      role: e.isActive("dialogue") ? (e.getAttributes("dialogue").role as string) : null,
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const c = () => editor.chain().focus();
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      <ToolButton label="Undo (Ctrl+Z)" onClick={() => c().undo().run()} disabled={!s.canUndo}>
        <Undo2 />
      </ToolButton>
      <ToolButton label="Redo (Ctrl+Shift+Z)" onClick={() => c().redo().run()} disabled={!s.canRedo}>
        <Redo2 />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolButton label="Paragraf biasa (Ctrl+Alt+0)" active={s.paragraph} onClick={() => c().setParagraph().run()}>
        <Pilcrow />
      </ToolButton>
      <ToolButton label="Heading PART" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
        <Heading2 />
      </ToolButton>
      <ToolButton label="Subjudul" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
        <Heading3 />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-border" />
      <ToolButton label="Bold (Ctrl+B)" active={s.bold} onClick={() => c().toggleBold().run()}>
        <Bold />
      </ToolButton>
      <ToolButton label="Italic (Ctrl+I)" active={s.italic} onClick={() => c().toggleItalic().run()}>
        <Italic />
      </ToolButton>
      <ToolButton label="Underline (Ctrl+U)" active={s.underline} onClick={() => c().toggleUnderline().run()}>
        <UnderlineIcon />
      </ToolButton>
      <ToolButton label="Highlight" active={s.highlight} onClick={() => c().toggleHighlight().run()}>
        <Highlighter />
      </ToolButton>
      <ToolButton label="Bullet list" active={s.bullet} onClick={() => c().toggleBulletList().run()}>
        <List />
      </ToolButton>
      <ToolButton label="Numbered list" active={s.ordered} onClick={() => c().toggleOrderedList().run()}>
        <ListOrdered />
      </ToolButton>
      <span className="mx-1 h-5 w-px bg-border" />
      {DIALOGUE_ROLES.map((r, i) => (
        <ToolButton
          key={r.value}
          label={`${r.label} (Ctrl+Alt+${i + 1})`}
          active={s.role === r.value}
          className={cn("px-2 text-[11px] font-bold tracking-wide", ROLE_STYLE[r.value])}
          onClick={() => (s.role === r.value ? c().unsetDialogue().run() : c().setDialogue(r.value).run())}
        >
          {r.label}
        </ToolButton>
      ))}
    </div>
  );
}

export interface ScriptEditorProps {
  script: { id: string; title: string; status: "draft" | "final"; content: TNode; updated_at: string };
  episode: { id: string; title: string; projectId: string };
  aiEnabled: boolean;
}

export function ScriptEditor({ script, episode, aiEnabled }: ScriptEditorProps) {
  const router = useRouter();
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [savedAt, setSavedAt] = useState<string>(script.updated_at);
  const [words, setWords] = useState(0);
  const [outline, setOutline] = useState<{ level: number; text: string; index: number }[]>([]);
  const [title, setTitle] = useState(script.title);
  const [status, setStatus] = useState(script.status);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef<Promise<boolean> | null>(null);
  const pendingAgain = useRef(false);
  const editorRef = useRef<Editor | null>(null);

  const refreshStats = useCallback((ed: Editor) => {
    setWords(countWords(ed.getText({ blockSeparator: " " })));
    const items: { level: number; text: string; index: number }[] = [];
    let hIndex = 0;
    ed.state.doc.forEach((node) => {
      if (node.type.name === "heading") {
        items.push({ level: node.attrs.level as number, text: node.textContent || "(tanpa judul)", index: hIndex });
        hIndex++;
      }
    });
    setOutline(items);
  }, []);

  const doSave = useCallback(async (mode: "auto" | "manual" = "auto"): Promise<boolean> => {
    const ed = editorRef.current;
    if (!ed) return true;
    if (saving.current) {
      pendingAgain.current = true;
      return saving.current;
    }
    setSaveState("saving");
    const run = (async () => {
      const res = await saveScriptContent(script.id, ed.getJSON(), countWords(ed.getText({ blockSeparator: " " })), mode);
      if (res.error) {
        setSaveState("error");
        toast.error(res.error);
        return false;
      }
      setSavedAt(res.savedAt!);
      setSaveState("saved");
      return true;
    })();
    saving.current = run;
    const ok = await run;
    saving.current = null;
    if (pendingAgain.current) {
      pendingAgain.current = false;
      return doSave(mode);
    }
    return ok;
  }, [script.id]);

  const flush = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      return doSave();
    }
    if (saving.current) return saving.current;
    return true;
  }, [doSave]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, code: false, codeBlock: false, link: false }),
      Highlight,
      Dialogue,
      Placeholder.configure({
        includeChildren: true,
        placeholder: ({ node }) => {
          if (node.type.name === "dialogue") return PLACEHOLDER[node.attrs.role as string] ?? "";
          if (node.type.name === "heading") return "Judul bagian";
          return "Tulis di sini...";
        },
      }),
    ],
    content: script.content,
    editorProps: {
      attributes: {
        class: "script-editor min-h-[60vh] px-6 py-8 sm:px-12",
        spellcheck: "true",
        "aria-label": "Editor naskah",
      },
    },
    onCreate: ({ editor: ed }) => {
      editorRef.current = ed;
      refreshStats(ed);
    },
    onUpdate: ({ editor: ed }) => {
      refreshStats(ed);
      setSaveState("dirty");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        void doSave();
      }, 1500);
    },
  });

  // Ctrl/Cmd + S = simpan manual
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (timer.current) {
          clearTimeout(timer.current);
          timer.current = null;
        }
        void doSave("manual").then((ok) => ok && toast.success("Naskah tersimpan"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doSave]);

  // Peringatan bila menutup tab saat ada perubahan belum tersimpan.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveState === "dirty" || saveState === "saving" || saveState === "error") {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveState]);

  // Simpan sebelum komponen dilepas (pindah halaman di dalam aplikasi).
  useEffect(() => () => void flush(), [flush]);

  const saveMeta = async (nextTitle: string, nextStatus: "draft" | "final") => {
    const res = await updateScriptMeta(script.id, nextTitle, nextStatus);
    if (res?.error) toast.error(res.error);
  };

  const insertTemplate = (key: ScriptTemplateKey) => {
    if (!editor) return;
    const tpl = SCRIPT_TEMPLATES[key].build();
    editor.chain().focus().insertContent(tpl.content ?? []).run();
    toast.success(`Template "${SCRIPT_TEMPLATES[key].label}" disisipkan`);
  };

  const exportAs = async (format: "pdf" | "docx" | "txt") => {
    const ok = await flush();
    if (!ok) return;
    window.location.href = `/api/export/script/${script.id}?format=${format}`;
  };

  const jumpTo = (index: number) => {
    const el = editor?.view.dom.querySelectorAll("h2, h3")[index];
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const statusLabel = useMemo(() => {
    switch (saveState) {
      case "saving":
        return (
          <span className="flex items-center gap-1.5 text-secondary">
            <Loader2 className="size-3.5 animate-spin" /> Menyimpan...
          </span>
        );
      case "dirty":
        return <span className="text-secondary">Perubahan belum tersimpan</span>;
      case "error":
        return (
          <span className="flex items-center gap-1.5 text-danger">
            <AlertCircle className="size-3.5" /> Gagal menyimpan
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-success">
            <Check className="size-3.5" /> Tersimpan{" "}
            {new Date(savedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
          </span>
        );
    }
  }, [saveState, savedAt]);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_260px]">
      <div className="min-w-0">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== script.title && saveMeta(title, status)}
            className="h-10 flex-1 text-lg font-semibold"
            aria-label="Judul script"
            maxLength={200}
          />
          <div className="flex flex-wrap items-center gap-2">
            <NativeSelect
              value={status}
              onChange={(e) => {
                const v = e.target.value as "draft" | "final";
                setStatus(v);
                void saveMeta(title, v);
              }}
              className="w-28"
              aria-label="Status script"
            >
              <option value="draft">Draft</option>
              <option value="final">Final</option>
            </NativeSelect>
            <Button
              variant="accent"
              loading={saveState === "saving"}
              onClick={async () => {
                if (timer.current) {
                  clearTimeout(timer.current);
                  timer.current = null;
                }
                if (await doSave("manual")) toast.success("Naskah tersimpan");
              }}
            >
              <Save /> Simpan
            </Button>
            <Button variant="outline" onClick={() => setAiOpen(true)}>
              <Sparkles /> Susun dengan AI
            </Button>
            <Dropdown>
              <DropdownTrigger asChild>
                <Button variant="outline">
                  <Download /> Export
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem onSelect={() => exportAs("pdf")}>PDF</DropdownItem>
                <DropdownItem onSelect={() => exportAs("docx")}>DOCX (Word)</DropdownItem>
                <DropdownItem onSelect={() => exportAs("txt")}>TXT</DropdownItem>
              </DropdownContent>
            </Dropdown>
            <Dropdown>
              <DropdownTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Aksi lain">
                  <MoreHorizontal />
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownLabel>Sisipkan template</DropdownLabel>
                {(Object.keys(SCRIPT_TEMPLATES) as ScriptTemplateKey[])
                  .filter((k) => k !== "blank")
                  .map((k) => (
                    <DropdownItem key={k} onSelect={() => insertTemplate(k)}>
                      <LayoutTemplate /> {SCRIPT_TEMPLATES[k].label}
                    </DropdownItem>
                  ))}
                <DropdownSeparator />
                <DropdownItem onSelect={() => setHistoryOpen(true)}>
                  <History /> Riwayat versi
                </DropdownItem>
                <DropdownItem
                  onSelect={async () => {
                    await flush();
                    router.push(`/teleprompter/${script.id}`);
                  }}
                >
                  <MonitorPlay /> Buka teleprompter
                </DropdownItem>
                <DropdownItem
                  onSelect={async () => {
                    await flush();
                    const res = await duplicateScript(script.id);
                    if (res?.error) toast.error(res.error);
                    else {
                      toast.success("Script diduplikasi");
                      router.push(`/scripts/${res.id}`);
                    }
                  }}
                >
                  <Copy /> Duplikasi script
                </DropdownItem>
                <DropdownItem asChild>
                  <Link href={`/projects/${episode.projectId}/episodes/${episode.id}`}>
                    <LayoutTemplate /> Buka episode
                  </Link>
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem danger onSelect={() => setConfirmDelete(true)}>
                  <Trash2 /> Hapus script
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="sticky top-14 z-20 flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface/95 px-3 py-1.5 backdrop-blur">
            {editor ? <Toolbar editor={editor} /> : <div className="h-8" />}
          </div>
          {editor ? (
            <EditorContent editor={editor} />
          ) : (
            <div className="flex min-h-[60vh] items-center justify-center text-secondary">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-muted/40 px-4 py-2 text-xs">
            <div className="flex gap-4 text-secondary">
              <span>{words.toLocaleString("id-ID")} kata</span>
              <span>Estimasi baca: {formatReading(words)}</span>
            </div>
            {statusLabel}
          </div>
        </div>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-20 xl:h-fit">
        <div className="rounded-xl border border-border bg-surface p-4">
          <h2 className="mb-2 text-sm font-semibold">Struktur naskah</h2>
          {outline.length === 0 ? (
            <p className="text-xs text-secondary">Tambahkan heading untuk membuat navigasi bagian.</p>
          ) : (
            <ol className="max-h-[50vh] space-y-0.5 overflow-y-auto text-sm">
              {outline.map((o) => (
                <li key={o.index}>
                  <button
                    type="button"
                    onClick={() => jumpTo(o.index)}
                    className={cn("w-full truncate rounded px-2 py-1 text-left hover:bg-muted", o.level === 3 ? "pl-5 text-xs text-secondary" : "font-medium")}
                  >
                    {o.text}
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="rounded-xl border border-border bg-surface p-4 text-xs text-secondary">
          <h2 className="mb-2 text-sm font-semibold text-primary">Format dialog</h2>
          <ul className="space-y-1.5">
            <li><b className="text-indigo-600">HOST</b> — teks yang dibacakan host</li>
            <li><b className="text-green-600">GUEST</b> — tempat jawaban narasumber</li>
            <li><b className="text-amber-600">HOST NOTE</b> — catatan khusus host</li>
            <li><b className="text-slate-600">TRANSITION</b> — kalimat penghubung</li>
          </ul>
          <p className="mt-3">Pintasan: Ctrl+Alt+1…4 untuk peran, Ctrl+Alt+0 paragraf biasa, Ctrl+S simpan.</p>
          <p className="mt-2">Auto save aktif: perubahan disimpan otomatis 1,5 detik setelah Anda berhenti mengetik.</p>
        </div>
      </aside>

      <AiScriptDialog scriptId={script.id} editor={editor} enabled={aiEnabled} open={aiOpen} onOpenChange={setAiOpen} />

      <VersionHistory
        scriptId={script.id}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        beforeRestore={flush}
        onRestored={(content, at) => {
          editor?.commands.setContent(content, { emitUpdate: false });
          if (editor) refreshStats(editor);
          setSavedAt(at);
          setSaveState("saved");
        }}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Hapus script?"
        description={`Script "${title}" akan dihapus permanen.`}
        onConfirm={async () => {
          if (timer.current) clearTimeout(timer.current);
          timer.current = null;
          const res = await deleteScript(script.id);
          if (res?.error) toast.error(res.error);
          else {
            toast.success("Script dihapus");
            router.push(`/scripts?episode=${episode.id}`);
          }
        }}
      />
    </div>
  );
}
