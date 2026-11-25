import { mergeAttributes, Node } from "@tiptap/core";
import { DIALOGUE_ROLES, type DialogueRole } from "@/lib/constants";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dialogue: {
      setDialogue: (role: DialogueRole) => ReturnType;
      unsetDialogue: () => ReturnType;
    };
  }
}

const ROLE_VALUES = DIALOGUE_ROLES.map((r) => r.value) as string[];

/** Blok dialog naskah: HOST, GUEST, HOST NOTE, TRANSITION. */
export const Dialogue = Node.create({
  name: "dialogue",
  group: "block",
  content: "inline*",
  defining: true,

  addAttributes() {
    return {
      role: {
        default: "host",
        parseHTML: (el) => {
          const r = el.getAttribute("data-role") ?? "host";
          return ROLE_VALUES.includes(r) ? r : "host";
        },
        renderHTML: (attrs) => ({
          "data-role": attrs.role,
          "data-label": DIALOGUE_ROLES.find((r) => r.value === attrs.role)?.label ?? "HOST",
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-dialogue]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-dialogue": "", class: "dialogue" }), 0];
  },

  addCommands() {
    return {
      setDialogue:
        (role) =>
        ({ commands }) =>
          commands.setNode(this.name, { role }),
      unsetDialogue:
        () =>
        ({ commands }) =>
          commands.setNode("paragraph"),
    };
  },

  addKeyboardShortcuts() {
    // Ctrl/Cmd + Alt + 1..4 untuk HOST, GUEST, HOST NOTE, TRANSITION; Ctrl/Cmd + Alt + 0 untuk paragraf biasa.
    const map: Record<string, () => boolean> = {
      "Mod-Alt-0": () => this.editor.commands.unsetDialogue(),
    };
    DIALOGUE_ROLES.forEach((r, i) => {
      map[`Mod-Alt-${i + 1}`] = () => this.editor.commands.setDialogue(r.value);
    });
    // Enter di akhir blok dialog: lanjut paragraf baru dengan peran yang sama.
    map["Enter"] = () => {
      const { $from, empty } = this.editor.state.selection;
      if (!empty || $from.parent.type.name !== this.name) return false;
      if ($from.parent.content.size === 0) return this.editor.commands.unsetDialogue();
      return false;
    };
    return map;
  },
});
