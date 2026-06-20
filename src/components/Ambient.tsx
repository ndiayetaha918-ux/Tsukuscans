import "./Ambient.css";

/* Ambient light leak: two soft, slowly drifting blooms behind all content —
   a warm vermillion ember and a cool moonlight counter-glow. Lit, filmic depth
   over the ink, blended additively so it only ever adds light. */
export function Ambient() {
  return (
    <div className="ambient" aria-hidden="true">
      <span className="ambient__leak ambient__leak--warm" />
      <span className="ambient__leak ambient__leak--cool" />
      <span className="ambient__leak ambient__leak--streak" />
    </div>
  );
}
