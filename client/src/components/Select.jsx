import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import "./Select.css";

function Select({
  value,
  onChange,
  options = [],
  placeholder = "Select…",
  disabled = false,
  className = "",
  id,
  ariaLabel,
  menuAlign = "left",
}) {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const wrapRef = useRef(null);
  const menuRef = useRef(null);

  const selectedIndex = useMemo(
    () => options.findIndex((o) => String(o.value) === String(value)),
    [options, value],
  );
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;

  const close = useCallback(() => {
    setOpen(false);
    setHighlight(-1);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) close();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open, close]);

  useLayoutEffect(() => {
    if (!open) return;
    const btn = wrapRef.current?.querySelector(".select-btn");
    const menu = menuRef.current;
    if (!btn || !menu) return;
    const place = () => {
      const rect = btn.getBoundingClientRect();
      const mh = menu.getBoundingClientRect().height;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      if (spaceBelow < mh && spaceAbove > spaceBelow) {
        menu.style.top = "auto";
        menu.style.bottom = "calc(100% + 6px)";
      } else {
        menu.style.top = "calc(100% + 6px)";
        menu.style.bottom = "auto";
      }
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  useEffect(() => {
    if (!open || highlight < 0) return;
    const el = menuRef.current?.querySelector(`[data-idx="${highlight}"]`);
    if (!el || !menuRef.current) return;
    const menu = menuRef.current;
    menu.scrollTop = Math.max(
      0,
      el.offsetTop - menu.clientHeight / 2 + el.clientHeight / 2,
    );
  }, [open, highlight]);

  const onKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (["Enter", " ", "ArrowDown", "ArrowUp"].includes(e.key)) {
        e.preventDefault();
        setHighlight(selectedIndex);
        setOpen(true);
      }
      return;
    }
    switch (e.key) {
      case "Escape":
      case "Tab":
        close();
        break;
      case "ArrowDown":
        e.preventDefault();
        setHighlight((h) => (h + 1) % options.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlight((h) => (h <= 0 ? options.length - 1 : h - 1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (highlight >= 0 && options[highlight]) {
          onChange(options[highlight].value);
          close();
        }
        break;
      default:
        break;
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`select${className ? ` ${className}` : ""}`}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        id={id}
        className="select-btn"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => {
          if (!open) setHighlight(selectedIndex);
          setOpen((v) => !v);
        }}
      >
        <span className={selected ? "select-label" : "select-placeholder"}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className={`select-chevron${open ? " up" : ""}`} />
      </button>
      {open && (
        <ul
          ref={menuRef}
          className={`select-menu${menuAlign === "right" ? " right" : ""}`}
          role="listbox"
        >
          {options.length === 0 ? (
            <li className="select-empty">No options</li>
          ) : (
            options.map((o, i) => (
              <li
                key={String(o.value)}
                data-idx={i}
                role="option"
                aria-selected={i === selectedIndex}
              >
                <button
                  type="button"
                  className={`select-option${i === highlight ? " highlight" : ""}`}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => {
                    onChange(o.value);
                    close();
                  }}
                >
                  <span className="select-option-label">{o.label}</span>
                  {i === selectedIndex && (
                    <Check size={15} className="select-check" />
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export default Select;