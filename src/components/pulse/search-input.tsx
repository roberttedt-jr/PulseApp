import { Search } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  icon?: boolean;
};

/** Search field that Safari/iOS Keychain will not treat as a password prompt. */
export const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput(
  {
    className,
    icon = true,
    id = "pulse_search_query_field",
    name = "pulse_search_query_field",
    autoComplete = "one-time-code",
    ...props
  },
  ref,
) {
  return (
    <div className="relative">
      {icon ? (
        <Search className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-muted-foreground" />
      ) : null}
      <input
        ref={ref}
        id={id}
        name={name}
        type="search"
        autoComplete={autoComplete}
        autoCorrect="off"
        autoCapitalize="none"
        spellCheck={false}
        enterKeyHint="search"
        className={cn(
          "flex h-12 w-full min-w-0 rounded-2xl border border-border bg-muted px-4 text-base text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50",
          icon && "pl-10",
          className,
        )}
        {...props}
      />
    </div>
  );
});
