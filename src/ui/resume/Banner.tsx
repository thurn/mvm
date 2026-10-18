/** The fallback banner when a saved round could not load and its level restarted (P14). */
export function RestartBanner({ reason, onDismiss }: { reason: string; onDismiss(): void }) {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        justifyContent: "center",
        padding: "6px 12px",
        background: "#5a2a1a",
        color: "#ffe6dc",
        fontSize: 14,
      }}
    >
      <span>
        Your saved round could not be restored, so the level restarted. Loot you had found is kept.
        ({reason})
      </span>
      <button
        type="button"
        onClick={onDismiss}
        style={{
          background: "none",
          border: "1px solid #ffe6dc",
          color: "#ffe6dc",
          borderRadius: 4,
          cursor: "pointer",
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
