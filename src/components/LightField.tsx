import { useStore } from "@/store/useStore";
import { derivePalette } from "@/lib/palette";
import "./LightField.css";

/* The room. Three layers of diffuse light sampled from the current content
   colour — a far wash, two mid blooms drifting out of phase, and a near spill.
   The content lights the interface; this is never a halo or a border. */
export function LightField() {
  const color = useStore((s) => s.ambientColor);
  const id = useStore((s) => s.ambientId);
  const p = derivePalette(color, id);
  const style = {
    ["--lf-dom" as string]: p.dom,
    ["--lf-sec1" as string]: p.sec1,
    ["--lf-sec2" as string]: p.sec2,
    ["--lf-acc" as string]: p.acc,
  } as React.CSSProperties;
  return (
    <div className="lightfield" aria-hidden="true" style={style}>
      <span className="lf lf--wash" />
      <span className="lf lf--bloom1" />
      <span className="lf lf--bloom2" />
      <span className="lf lf--spill" />
    </div>
  );
}
