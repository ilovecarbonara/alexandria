interface HashDisplayProps {
  hash: string;
  className?: string;
}

export function HashDisplay({ hash, className = "" }: HashDisplayProps) {
  const truncated = hash.length > 16 ? `${hash.slice(0, 8)}…${hash.slice(-8)}` : hash;

  return (
    <span
      className={`font-mono text-hash ${className}`}
      title={hash}
    >
      {truncated}
    </span>
  );
}
