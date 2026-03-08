export function AccordionItem({ id, title, isOpen, onToggle, children }) {
  const buttonId = `accordion-button-${id}`;
  const contentId = `accordion-content-${id}`;

  return (
    <div className="border rounded-lg mb-3">
      <button
        id={buttonId}
        type="button"
        className="w-full flex justify-between items-center px-3 py-2 text-sm font-medium"
        onClick={() => onToggle(id)}
        aria-expanded={isOpen}
        aria-controls={contentId}
      >
        <span>{title}</span>
        <span className="text-gray-500">{isOpen ? "-" : "+"}</span>
      </button>
      {isOpen && <div id={contentId} role="region" aria-labelledby={buttonId} className="px-3 pb-3 pt-1">{children}</div>}
    </div>
  );
}

