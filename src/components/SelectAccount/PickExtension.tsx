import { cn } from "@/lib/utils";
import { useStateObservable } from "@react-rxjs/core";
import { FC } from "react";
import { Button } from "../ui/button";
import {
  availableExtensions$,
  selectedExtension$,
  selectExtension,
} from "./extension.state";

const preferredExtensions = [
  {
    id: "nova-wallet",
    name: "Nova Wallet",
    logo: import.meta.env.BASE_URL + "novawallet.webp",
  },
  {
    id: "talisman",
    name: "Talisman",
    logo: import.meta.env.BASE_URL + "talisman.webp",
  },
  {
    id: "subwallet-js",
    name: "Subwallet",
    logo: import.meta.env.BASE_URL + "subwallet.webp",
  },
];

export const PickExtension = () => {
  const availableExtensions = useStateObservable(availableExtensions$);
  const preferredExtensionIds = new Set(preferredExtensions.map((v) => v.id));
  const hasNova = availableExtensions.includes("nova-wallet");
  // Nova Wallet puts themselves as "polkadot-js" too. Because it's a mobile in-app browser, we're guaranteed only to have nova.
  const otherExtensions = hasNova
    ? []
    : availableExtensions.filter((id) => !preferredExtensionIds.has(id));

  return (
    <div className="space-y-2">
      <ul className="flex gap-2 flex-wrap justify-evenly">
        {preferredExtensions.map((props) => (
          <li>
            <PreferredExtensionButton key={props.id} {...props} />
          </li>
        ))}
      </ul>
      {otherExtensions.length ? (
        <div className="space-y-1">
          <p className="text-sm text-foreground/60">
            Other installed extensions
          </p>
          <ul className="flex gap-2">
            {otherExtensions.map((id) => (
              <li>
                <ExtensionButton key={id} id={id} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
};

const PreferredExtensionButton: FC<{
  id: string;
  name: string;
  logo: string;
}> = ({ name, logo, id }) => {
  const availableExtensions = useStateObservable(availableExtensions$);
  const selectedExtension = useStateObservable(selectedExtension$);

  const isAvailable = availableExtensions.includes(id);
  const isSelected = selectedExtension?.name === id;

  return (
    <Button
      className={cn("h-auto w-40", isSelected ? "bg-accent" : "")}
      variant="outline"
      onClick={() => selectExtension(id)}
      disabled={!isAvailable}
    >
      <img src={logo} alt={id} className="h-10 rounded" />
      <div className="text-left">
        <span className="font-bold">{name}</span>
        {!isAvailable && (
          <div className="text-sm text-foreground/80">Not installed</div>
        )}
      </div>
    </Button>
  );
};

const ExtensionButton: FC<{
  id: string;
}> = ({ id }) => {
  const availableExtensions = useStateObservable(availableExtensions$);
  const selectedExtension = useStateObservable(selectedExtension$);

  const isAvailable = availableExtensions.includes(id);
  const isSelected = selectedExtension?.name === id;

  return (
    <Button
      variant="outline"
      className={isSelected ? "bg-accent" : ""}
      onClick={() => selectExtension(id)}
      disabled={!isAvailable}
    >
      {id}
    </Button>
  );
};
