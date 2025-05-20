import { LoaderCircle, LucideProps } from "lucide-react";
import { FC, PropsWithChildren } from "react";
import { twMerge } from "tailwind-merge";

export const Spinner = (props: LucideProps) => (
  <LoaderCircle
    {...props}
    className={twMerge("animate-spin", props.className)}
  />
);

export const Loading: FC<PropsWithChildren> = ({ children }) => (
  <div
    className={"flex items-center justify-center gap-2 text-muted-foreground"}
  >
    <Spinner />
    {children}
  </div>
);
