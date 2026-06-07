interface ProductPhotoProps {
  photoUrl?: string;
  name: string;
  className?: string;
}

export function ProductPhoto({ photoUrl, name, className = '' }: ProductPhotoProps) {
  if (photoUrl) {
    return <img src={photoUrl} alt={name} className={`object-cover ${className}`} loading="lazy" />;
  }

  return (
    <div
      className={`flex items-center justify-center bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold ${className}`}
    >
      <span className="text-2xl">{name.charAt(0).toUpperCase() || '?'}</span>
    </div>
  );
}
