import EdelweissMark from './brand/EdelweissMark';

export default function RouteFallback() {
  return (
    <div
      role="status"
      aria-label="Loading page"
      className="flex min-h-[40dvh] w-full flex-col items-center justify-center gap-3 px-4"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <EdelweissMark className="size-6 animate-pulse" />
      </span>
    </div>
  );
}
