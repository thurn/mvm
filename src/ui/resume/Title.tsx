/** The title until focus select (1.34): one button into Level 1. */
export function Title({ onPlay }: { onPlay(): void }) {
  return (
    <main
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "100vh",
        gap: 16,
        textAlign: "center",
      }}
    >
      <div>
        <h1 style={{ margin: "0 0 16px" }}>Mercs vs. Monsters</h1>
        <button
          type="button"
          onClick={onPlay}
          style={{
            padding: "10px 24px",
            fontSize: 18,
            background: "#23272f",
            color: "#e8e8e8",
            border: "1px solid #ffd166",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          Play Level 1
        </button>
      </div>
    </main>
  );
}
