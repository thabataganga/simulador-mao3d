export function AccordionItem({ id, title, isOpen, onToggle, children }) {
  return (
    <div className="border rounded-lg mb-3">
        <button
          type="button"
          className="w-full flex justify-between items-center px-3 py-2 text-sm font-medium"
          onClick={() => onToggle(id)}
          aria-expanded={isOpen}
          aria-controls={`accordion-content-${id}`}
        >
        <span>{title}</span>
        <span className="text-gray-500">{isOpen ? "−" : "+"}</span>
      </button>
      {isOpen && <div id={`accordion-content-${id}`} role="region" aria-labelledby={id} className="px-3 pb-3 pt-1">{children}</div>}
    </div>
  );
}