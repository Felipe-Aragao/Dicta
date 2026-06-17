import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { FunnelSimple } from "@phosphor-icons/react";

const DEFAULT_FIELDS = ["professor", "discipline", "status"];

const FIELD_CONFIG = {
  professor: {
    label: "Professor",
    optionKey: "professors",
  },
  discipline: {
    label: "Disciplina",
    optionKey: "disciplines",
  },
  status: {
    label: "Status",
    optionKey: "statuses",
  },
};

function FilterField({ idPrefix, field, value, options, onChange }) {
  const config = FIELD_CONFIG[field];
  const inputId = `${idPrefix}-${field}-filter`;
  const suggestionsRef = useRef(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const normalizedValue = value.trim().toLowerCase();
  const visibleOptions = options
    .filter((option) => option.toLowerCase().includes(normalizedValue))
    .slice(0, 24);

  useLayoutEffect(() => {
    const suggestions = suggestionsRef.current;
    if (!suggestions) {
      setCanExpand(false);
      return;
    }

    setCanExpand(suggestions.scrollHeight > 46);
  }, [visibleOptions, expanded]);

  useEffect(() => {
    setExpanded(false);
  }, [field, value]);

  return (
    <div className="filter-field">
      <label htmlFor={inputId}>{config.label}</label>
      <input
        id={inputId}
        className="filter-input"
        type="text"
        value={value}
        onChange={(event) => onChange(field, event.target.value)}
        placeholder="Digite ou escolha"
        autoComplete="off"
      />
      {visibleOptions.length > 0 && (
        <>
          <div
            className={`filter-suggestions${expanded ? " expanded" : ""}`}
            aria-label={`Sugestões de ${config.label.toLowerCase()}`}
            ref={suggestionsRef}
          >
            {visibleOptions.map((option) => {
              const selected = option.toLowerCase() === normalizedValue;

              return (
                <button
                  key={option}
                  type="button"
                  className={`filter-suggestion${selected ? " selected" : ""}`}
                  onClick={() => onChange(field, selected ? "" : option)}
                >
                  {option}
                </button>
              );
            })}
          </div>
          {canExpand && (
            <button
              type="button"
              className="filter-expand-btn"
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? "Mostrar menos" : "Mostrar mais"}
            </button>
          )}
        </>
      )}
    </div>
  );
}

export function ActivitySearchFilters({
  idPrefix,
  filters,
  options,
  open,
  fields = DEFAULT_FIELDS,
  onToggle,
  onClose,
  onChange,
  onClear,
}) {
  const rootRef = useRef(null);
  const activeCount = Object.values(filters).filter((value) => value.trim()).length;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose, open]);

  return (
    <div className="filter-popover-wrap" ref={rootRef}>
      <button
        type="button"
        className={`filter-toggle-btn${activeCount ? " active" : ""}`}
        onClick={onToggle}
        aria-label="Filtrar atividades"
        aria-expanded={open}
        title="Filtrar atividades"
      >
        <FunnelSimple size={18} weight="regular" />
      </button>

      {open && (
        <div className="filter-popover" role="dialog" aria-label="Filtros de pesquisa">
          <div className="filter-popover-head">
            <span>Filtros</span>
            {activeCount > 0 && (
              <button type="button" className="filter-clear-btn" onClick={onClear}>
                Limpar
              </button>
            )}
          </div>

          {fields.map((field) => (
            <FilterField
              key={field}
              idPrefix={idPrefix}
              field={field}
              value={filters[field] || ""}
              options={options[FIELD_CONFIG[field].optionKey] || []}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
