import "./Skeleton.css";

export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <span className={`skel ${className}`} style={style} aria-hidden="true" />;
}

export function PosterSkeletons({ count = 6, width = 132 }: { count?: number; width?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="poster-skel" style={{ width }}>
          <Skeleton className="poster-skel__img" />
          <Skeleton className="poster-skel__line" />
        </div>
      ))}
    </>
  );
}
