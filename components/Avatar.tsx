type AvatarProps = {
  src?: string | null;
  fallback: string;
  size?: string;
};

export default function Avatar({
  src,
  fallback,
  size = "h-10 w-10",
}: AvatarProps) {
  return (
    <div
      className={`flex ${size} items-center justify-center overflow-hidden rounded-full bg-white/10 text-white`}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-medium">{fallback[0]?.toUpperCase()}</span>
      )}
    </div>
  );
}