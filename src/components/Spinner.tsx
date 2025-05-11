import { LoaderCircle, LucideProps } from "lucide-react";
import { twMerge } from "tailwind-merge";

export const Spinner = (props: LucideProps) => (
  <LoaderCircle
    {...props}
    className={twMerge("animate-spin", props.className)}
  />
);
