import { CHANGES, CREDITS, LPC_LINE } from "../../assets/credits";
import { MenuButton, MenuScreen, MENU } from "./layout";

/** The credits screen (G §8.2): grouped by pack, with authors, licences and the LPC line. */
export function Credits({ onBack }: { onBack(): void }) {
  const packs = new Map<
    string,
    { authors: Set<string>; licenses: Set<string>; files: number; text?: string }
  >();
  for (const credit of CREDITS) {
    const pack = packs.get(credit.pack) ?? { authors: new Set(), licenses: new Set(), files: 0 };
    credit.authors.forEach((a) => pack.authors.add(a));
    credit.licenses.forEach((l) => pack.licenses.add(l));
    pack.files++;
    if (!pack.text && credit.text && credit.authors.length === 0) pack.text = credit.text;
    packs.set(credit.pack, pack);
  }
  return (
    <MenuScreen music="title">
      <h2 style={{ margin: "0 0 8px" }}>Credits</h2>
      <div style={{ color: MENU.dim, marginBottom: 12 }}>
        {LPC_LINE}. {CHANGES}.
      </div>
      <div
        data-testid="credits"
        style={{
          maxWidth: 760,
          maxHeight: "70vh",
          overflow: "auto",
          textAlign: "left",
          font: "12px/1.4 monospace",
        }}
      >
        {[...packs].map(([name, pack]) => (
          <section key={name} style={{ marginBottom: 12 }}>
            <b>{name}</b> <span style={{ color: MENU.dim }}>({pack.files} files)</span>
            {pack.licenses.size > 0 && (
              <div style={{ color: MENU.dim }}>{[...pack.licenses].join(", ")}</div>
            )}
            {pack.authors.size > 0 ? (
              <div>{[...pack.authors].join(", ")}</div>
            ) : (
              pack.text && (
                <pre style={{ whiteSpace: "pre-wrap", margin: 0, color: MENU.dim }}>
                  {pack.text.slice(0, 600)}
                </pre>
              )
            )}
          </section>
        ))}
      </div>
      <MenuButton onClick={onBack}>Back</MenuButton>
    </MenuScreen>
  );
}
