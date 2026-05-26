"use client";

export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="page-content">
        {children}
      </div>
      <style>{`
        @media (min-width: 768px) {
          .page-content {
            margin-left: 220px;
          }
        }
      `}</style>
    </>
  );
}
