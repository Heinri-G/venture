import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader } from '../ui/card';
import EdelweissMark from '../brand/EdelweissMark';

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
        <div className="absolute inset-0 bg-meadow opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      </div>

      <div className="relative w-full max-w-md">
        <Card className="rounded-2xl py-8 shadow-lg shadow-black/5 ring-1 ring-border">
          <CardHeader className="items-center gap-3 text-center">
            <Link
              to="/"
              className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground ring-1 ring-primary/20"
              aria-label="Venture home"
            >
              {icon ?? <EdelweissMark className="size-6" />}
            </Link>
            <div className="flex flex-col gap-1.5">
              <h1 className="font-heading text-3xl font-bold tracking-tight">{title}</h1>
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
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
