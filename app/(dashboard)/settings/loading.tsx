export default function Loading() {
  return (
    <div className="max-w-xl space-y-6 animate-pulse">
      <div className="h-8 w-32 bg-noir-800 rounded-lg" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 bg-noir-800 rounded-xl" />
      ))}
    </div>
  );
}
