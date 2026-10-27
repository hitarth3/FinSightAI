interface SectionNavProps<T extends string> {
  label: string;
  value: T;
  items: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function SectionNav<T extends string>({ label, value, items, onChange }: SectionNavProps<T>) {
  return <nav className="section-nav" aria-label={label}>
    {items.map(item => <button key={item.value} type="button" aria-pressed={value === item.value}
      onClick={() => onChange(item.value)}>{item.label}</button>)}
  </nav>;
}
