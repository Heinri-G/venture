import React from 'react';
import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';

export default function AuthShell({
  icon,
  title,
  description,
  children,
  footer,
}: {
  icon?: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-[calc(100dvh-4rem)] items-center justify-center overflow-hidden px-4 py-14">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-grid opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
        <div className="absolute left-1/2 top-0 h-80 w-[36rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-sky-400/15 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-violet-400/15 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Card className="py-8 shadow-xl shadow-primary/5 ring-1 ring-border">
          <CardHeader className="items-center gap-3 text-center">
            <Link
              to="/"
              className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-primary-foreground shadow-lg shadow-primary/25"
              aria-label="Venture home"
            >
              {icon ?? <Compass className="size-6" />}
            </Link>
            <div className="flex flex-col gap-1.5">
              <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </CardHeader>
          <CardContent className="px-7">{children}</CardContent>
          <CardFooter className="justify-center border-t-0 bg-transparent px-7">
            {footer}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
