export default function LoadingSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-5 animate-fade-in" style={{ animationDelay: `${i * 50}ms` }}>
          <div className="flex justify-between mb-3">
            <div className="flex-1">
              <div className="skeleton h-5 w-3/4 mb-2" />
              <div className="skeleton h-3 w-full" />
            </div>
            <div className="skeleton h-8 w-10 ml-3 rounded" />
          </div>
          <div className="flex gap-2 mb-3">
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton h-5 w-20 rounded-full" />
          </div>
          <div className="skeleton h-1 w-full rounded-full mt-3" />
        </div>
      ))}
    </div>
  );
}
