import { useState, useRef, useEffect, useId } from "react";
import styles from "./champion-select.module.css";

interface Props {
  value: string;
  champions: string[];
  onChange: (champion: string) => void;
  allowEmpty?: boolean;
  "aria-label"?: string;
}

/**
 * Searchable champion combobox.
 * Filters the champion list as the user types and shows an icon next to each
 * match. Selecting a champion closes the dropdown and fills the field.
 */
export function ChampionSelect({
  value,
  champions,
  onChange,
  allowEmpty = false,
  "aria-label": ariaLabel,
}: Props) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keep input in sync when the parent resets the value externally
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered = query.trim()
    ? champions.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    : champions;

  function commit(champion: string) {
    setQuery(champion);
    onChange(champion);
    setOpen(false);
    setActiveIdx(-1);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQuery(e.target.value);
    setOpen(true);
    setActiveIdx(-1);
  }

  function handleBlur() {
    // If the field is cleared and blank is allowed (e.g. ban slots), commit
    // an empty string so the parent knows the ban was removed.
    if (allowEmpty && query.trim() === "") {
      commit("");
      return;
    }

    // Otherwise enforce that the final value is a valid champion from the list.
    // If the user typed something that doesn't match, revert to the last
    // committed value so free-text entries are never saved.
    const match = champions.find(
      (c) => c.toLowerCase() === query.trim().toLowerCase(),
    );
    if (match) {
      // Normalize to official casing if different from what's committed
      if (match !== value) commit(match);
    } else {
      setQuery(value);
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true);
        setActiveIdx(0);
        e.preventDefault();
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx >= 0 && filtered[activeIdx]) {
        commit(filtered[activeIdx]);
      }
    } else if (e.key === "Escape") {
      // Revert to last committed value and close
      setQuery(value);
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  // Scroll active item into view
  useEffect(() => {
    if (activeIdx < 0 || !listRef.current) return;
    const item = listRef.current.children[activeIdx] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  // Close dropdown on outside click
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={containerRef} className={styles.wrapper}>
      <input
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={
          activeIdx >= 0 ? `${listId}-${activeIdx}` : undefined
        }
        aria-label={ariaLabel}
        className={`${styles.input} ${allowEmpty && query ? styles.inputWithClear : ""}`}
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        spellCheck={false}
      />

      {allowEmpty && query && (
        <button
          className={styles.clearBtn}
          tabIndex={-1}
          aria-label="Clear selection"
          onPointerDown={(e) => {
            // Prevent the input from losing focus (and triggering blur revert)
            // before we can commit the cleared value.
            e.preventDefault();
            commit("");
          }}
        >
          ×
        </button>
      )}

      {open && filtered.length > 0 && (
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className={styles.dropdown}
        >
          {filtered.map((champion, idx) => (
            <li
              key={champion}
              id={`${listId}-${idx}`}
              role="option"
              aria-selected={idx === activeIdx}
              className={`${styles.option} ${idx === activeIdx ? styles.active : ""}`}
              onPointerDown={(e) => {
                // prevent input blur before we can commit
                e.preventDefault();
                commit(champion);
              }}
            >
              <img
                src={`/champion-images/${champion}.png`}
                alt=""
                className={styles.icon}
                loading="lazy"
              />
              <span>{champion}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
