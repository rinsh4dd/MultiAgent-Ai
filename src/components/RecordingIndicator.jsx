export default function RecordingIndicator() {
  return (
    <div className="flex items-center gap-3 px-2 py-1 animate-in fade-in duration-300">
      <div className="flex items-center gap-1 h-3">
        {[...Array(4)].map((_, i) => (
          <span
            key={i}
            className="w-0.5 bg-red-500 rounded-full animate-pulse"
            style={{ 
              height: '100%',
              animationDelay: `${i * 0.15}s`,
              animationDuration: '1s' 
            }}
          />
        ))}
      </div>
      <span className="text-[10px] text-red-500 font-medium uppercase tracking-[0.2em]">
        Recording Audio
      </span>
    </div>
  );
}