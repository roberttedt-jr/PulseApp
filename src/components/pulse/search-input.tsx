import { Search, X } from "lucide-react";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  icon?: boolean;
  onClear?: () => void;
};

/** Search field that Safari/iOS Keychain will not treat as a password prompt. */
export const SearchInput = forwardRef<HTMLInputElement, Props>(function SearchInput(
  {
    className,
    icon = true,
    onClear,
    id = "pulse_search_query_field",
    name = "pulse_search_query_field",
    autoComplete = "one-time-code",
    autoCorrect = "off",
    autoCapitalize = "none",
    spellCheck = false,
    ...props
  },
  ref,
) {
  const hasValue = Boolean(props.value && String(props.value).length > 0);
  return (
    <div className="relative">
      {icon ? (
        <Search className="pointer-events-none absolute top-3.5 left-3.5 size-4 text-muted-foreground" />
      ) : null}
      <input
        {...props}
        ref={ref}
        id={id}
        name={name}
        type="search"
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        autoCapitalize={autoCapitalize}
        spellCheck={spellCheck}
        enterKeyHint="search"
        className={cn(
          "flex h-12 w-full min-w-0 rounded-2xl border border-border bg-muted px-4 text-base text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/60 disabled:opacity-50 [&::-webkit-search-cancel-button]:appearance-none",
          icon && "pl-10",
          onClear && hasValue && "pr-10",
          className,
        )}
      />
      {onClear && hasValue ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Limpiar búsqueda"
          className="absolute top-3.5 right-3.5 grid size-5 place-items-center rounded-full bg-muted-foreground/20 text-muted-foreground transition-colors hover:bg-muted-foreground/30 hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
});
