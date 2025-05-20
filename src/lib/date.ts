import { format } from "date-fns";

export const formatDate = (value: Date | undefined | null) =>
  value ? format(value, "PPP") : "…";
