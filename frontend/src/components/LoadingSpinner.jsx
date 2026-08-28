export default function LoadingSpinner({ size = 'md', text }) {
  const sizes = { sm: 'w-5 h-5', md: 'w-8 h-8', lg: 'w-12 h-12' };
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className={`${sizes[size]} border-4 border-primary/20 border-t-primary rounded-full animate-spin`} />
      {text && <p className="text-slate-500 text-sm font-medium">{text}</p>}
    </div>
  );
}
