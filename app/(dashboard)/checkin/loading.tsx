export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 w-32 bg-noir-800 rounded" />
        <div className="h-8 w-52 bg-noir-800 rounded-lg" />
      </div>
      <div className="h-20 bg-noir-800 rounded-2xl" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="aspect-square bg-noir-800 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
