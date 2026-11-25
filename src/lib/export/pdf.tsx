import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";
import { roleLabel } from "@/lib/script/blocks";
import type { Run } from "@/lib/script/types";
import type { ExportDoc, ExportBlock } from "./model";

const C = { primary: "#1E293B", secondary: "#64748B", border: "#E2E8F0", muted: "#F1F5F9", accent: "#6366F1" };
const ROLE: Record<string, { bar: string; fill: string; label: string }> = {
  host: { bar: "#6366F1", fill: "#EEF2FF", label: "#4338CA" },
  guest: { bar: "#16A34A", fill: "#F0FDF4", label: "#15803D" },
  host_note: { bar: "#D97706", fill: "#FFFBEB", label: "#B45309" },
  transition: { bar: "#64748B", fill: "#F1F5F9", label: "#475569" },
};

const s = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 52, fontSize: 10.5, fontFamily: "Helvetica", color: C.primary },
  brand: { fontSize: 8, color: C.secondary, letterSpacing: 1, marginBottom: 6 },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", lineHeight: 1.25, marginBottom: 6 },
  subtitle: { fontSize: 11, color: C.secondary, marginBottom: 8 },
  metaRow: { flexDirection: "row", fontSize: 9, marginBottom: 2 },
  metaKey: { width: 110, color: C.secondary },
  divider: { borderBottomWidth: 1, borderBottomColor: C.border, marginVertical: 12 },
  h2: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6, paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: C.border },
  h3: { fontSize: 11, fontFamily: "Helvetica-Bold", color: C.secondary, marginTop: 8, marginBottom: 4 },
  para: { marginBottom: 6, lineHeight: 1.45 },
  dialogue: { borderLeftWidth: 3, paddingVertical: 5, paddingHorizontal: 8, marginBottom: 7, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  role: { fontSize: 7.5, fontFamily: "Helvetica-Bold", letterSpacing: 0.8, marginBottom: 2 },
  fieldLabel: { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: C.secondary, marginTop: 8, marginBottom: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  li: { flexDirection: "row", marginBottom: 3, lineHeight: 1.45 },
  liMark: { width: 16 },
  qWrap: { marginBottom: 10, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: C.border },
  qText: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  qMeta: { fontSize: 8.5, color: C.secondary, marginTop: 2, marginLeft: 18 },
  qSub: { fontSize: 9.5, marginTop: 2, marginLeft: 18 },
  th: { fontFamily: "Helvetica-Bold", backgroundColor: C.muted },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.border },
  td: { padding: 5, fontSize: 9.5 },
  footerLeft: { position: "absolute", bottom: 24, left: 52, width: 250, fontSize: 8, color: C.secondary },
  footerRight: { position: "absolute", bottom: 24, left: 300, right: 52, textAlign: "right", fontSize: 8, color: C.secondary },
});

function RunsText({ runs, style, minPresenceAhead }: { runs: Run[]; style?: Style; minPresenceAhead?: number }) {
  return (
    <Text style={style} minPresenceAhead={minPresenceAhead}>
      {runs.map((r, i) => (
        <Text
          key={i}
          style={{
            fontFamily: r.bold && r.italic ? "Helvetica-BoldOblique" : r.bold ? "Helvetica-Bold" : r.italic ? "Helvetica-Oblique" : undefined,
            textDecoration: r.underline ? "underline" : undefined,
            backgroundColor: r.highlight ? "#FEF08A" : undefined,
          }}
        >
          {r.text}
        </Text>
      ))}
    </Text>
  );
}

function BlockView({ b }: { b: ExportBlock }) {
  switch (b.kind) {
    case "heading":
      return <RunsText runs={b.runs} style={b.level <= 2 ? s.h2 : s.h3} minPresenceAhead={60} />;
    case "paragraph":
      return b.runs.length ? <RunsText runs={b.runs} style={s.para} /> : <Text style={s.para}> </Text>;
    case "quote":
      return <RunsText runs={b.runs} style={{ ...s.para, color: C.secondary, marginLeft: 12 }} />;
    case "rule":
      return <View style={s.divider} />;
    case "list":
      return (
        <View style={{ marginBottom: 6 }}>
          {b.items.map((it, i) => (
            <View key={i} style={s.li} wrap={false}>
              <Text style={s.liMark}>{b.ordered ? `${i + 1}.` : "•"}</Text>
              <RunsText runs={it} style={{ flex: 1 }} />
            </View>
          ))}
        </View>
      );
    case "dialogue": {
      const c = ROLE[b.role] ?? ROLE.host!;
      return (
        <View style={{ ...s.dialogue, borderLeftColor: c.bar, backgroundColor: c.fill }} wrap={false}>
          <Text style={{ ...s.role, color: c.label }}>{roleLabel(b.role)}</Text>
          {b.runs.length ? (
            <RunsText runs={b.runs} style={b.role === "host_note" ? { fontFamily: "Helvetica-Oblique", lineHeight: 1.4 } : { lineHeight: 1.4 }} />
          ) : (
            <Text style={{ color: "#94A3B8" }}>…</Text>
          )}
        </View>
      );
    }
    case "field":
      return (
        <View>
          <Text style={s.fieldLabel}>{b.label}</Text>
          <Text style={{ lineHeight: 1.45 }}>{b.text}</Text>
        </View>
      );
    case "question":
      return (
        <View style={s.qWrap} wrap={false}>
          <View style={{ flexDirection: "row" }}>
            <Text style={{ ...s.qText, width: 18 }}>{b.number}.</Text>
            <Text style={{ ...s.qText, flex: 1 }}>{b.text}</Text>
          </View>
          <Text style={s.qMeta}>{[b.category, ...b.badges].join("  ·  ")}</Text>
          {b.purpose ? <Text style={s.qSub}>Tujuan: {b.purpose}</Text> : null}
          {b.notes ? <Text style={{ ...s.qSub, color: "#B45309", fontFamily: "Helvetica-Oblique" }}>Host note: {b.notes}</Text> : null}
          {b.followUps.map((f, i) => (
            <Text key={i} style={{ ...s.qSub, marginLeft: 30 }}>
              » {f}
            </Text>
          ))}
        </View>
      );
    case "table": {
      const widths = b.widths ?? b.header.map(() => 1);
      const row = (cells: string[], header: boolean, key: string | number) => (
        <View key={key} style={{ ...s.tr, ...(header ? s.th : {}) }} wrap={false}>
          {cells.map((c, i) => (
            <Text key={i} style={{ ...s.td, flex: widths[i], ...(header ? { fontFamily: "Helvetica-Bold" } : {}) }}>
              {c}
            </Text>
          ))}
        </View>
      );
      return (
        <View style={{ borderWidth: 0.5, borderColor: C.border, marginBottom: 10 }}>
          {row(b.header, true, "h")}
          {b.rows.map((r, i) => row(r, false, i))}
          {b.footer ? row(b.footer, true, "f") : null}
        </View>
      );
    }
  }
}

function Pdf({ doc }: { doc: ExportDoc }) {
  const printed = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  return (
    <Document title={doc.title} author="Sukowati Berdikari" creator="Sukowati Berdikari">
      <Page size="A4" style={s.page}>
        <Text style={s.brand}>SUKOWATI BERDIKARI · PODCAST STUDIO</Text>
        <Text style={s.title}>{doc.title}</Text>
        {doc.subtitle ? <Text style={s.subtitle}>{doc.subtitle}</Text> : null}
        {doc.meta.map(([k, v]) => (
          <View key={k} style={s.metaRow}>
            <Text style={s.metaKey}>{k}</Text>
            <Text style={{ flex: 1 }}>{v}</Text>
          </View>
        ))}
        <View style={s.divider} />
        {doc.blocks.map((b, i) => (
          <BlockView key={i} b={b} />
        ))}
        <Text style={s.footerLeft} fixed>
          {doc.title}
        </Text>
        <Text style={s.footerRight} fixed render={({ pageNumber, totalPages }) => `Dicetak ${printed} · Halaman ${pageNumber}/${totalPages}`} />
      </Page>
    </Document>
  );
}

export function toPdf(doc: ExportDoc): Promise<Buffer> {
  return renderToBuffer(<Pdf doc={doc} />);
}
