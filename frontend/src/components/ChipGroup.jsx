import React, { useRef } from 'react';

// Grupo de opções exclusivas (radiogroup) desenhado como chips ou segmentado.
// Teclado: Tab entra no item selecionado; setas, Home e End trocam a opção.
// options: [{ value, label, icon?, color?, className? }]
export default function ChipGroup({
  options,
  value,
  onChange,
  labelledBy,
  className = 'chips',
  chipClassName = 'chip',
  invalid = false,
  describedBy
}) {
  const refs = useRef([]);
  const selecionado = options.findIndex((o) => o.value === value);
  const focavel = selecionado >= 0 ? selecionado : 0;

  function mover(indice) {
    const total = options.length;
    const alvo = (indice + total) % total;
    onChange(options[alvo].value);
    refs.current[alvo]?.focus();
  }

  function handleKeyDown(e, indice) {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        mover(indice + 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        mover(indice - 1);
        break;
      case 'Home':
        e.preventDefault();
        mover(0);
        break;
      case 'End':
        e.preventDefault();
        mover(options.length - 1);
        break;
      default:
    }
  }

  return (
    <div
      className={className}
      role="radiogroup"
      aria-labelledby={labelledBy}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
    >
      {options.map((opt, i) => {
        const checked = opt.value === value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={i === focavel ? 0 : -1}
            className={`${chipClassName} ${opt.className || ''}`}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e) => handleKeyDown(e, i)}
          >
            {opt.color && <span className="dot sm" style={{ background: opt.color }} aria-hidden="true" />}
            {Icon && <Icon size={14} aria-hidden="true" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
