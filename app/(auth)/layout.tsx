export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-2xl text-ink">Alexandria</h1>
          <p className="mt-1 text-xs text-ink-subtle">
            Academic Thesis Registry
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
